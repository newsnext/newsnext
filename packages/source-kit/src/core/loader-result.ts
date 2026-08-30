import type { NewsItem, SourceLoaderOutput, SourceLoaderResult } from "../types"
import { NEWS_ITEM_STAT_KEYS } from "@newsnext/shared/types"
import { isSourcePresentationMetadataKey, isSourcePresentationType } from "../types"
import {
  compileSourceTemplate,
  createSourceTemplateScope,
  reportTemplateError,
} from "./template"

const SOURCE_LOADER_RESULT_MAX_ITEMS = 50

export function validateSourceLoaderResult(value: unknown): SourceLoaderResult {
  return renderSourceLoaderResult(validateSourceLoaderOutput(value))
}

export interface ValidatedSourceLoaderOutput extends Omit<SourceLoaderOutput, "items"> {
  items: NewsItem[]
}

export function validateSourceLoaderOutput(value: unknown): ValidatedSourceLoaderOutput {
  const normalized = normalizeSourceLoaderResult(value)
  assertSourceLoaderOutput(normalized)
  if (normalized.items.length <= SOURCE_LOADER_RESULT_MAX_ITEMS) return normalized
  return {
    ...normalized,
    items: normalized.items.slice(0, SOURCE_LOADER_RESULT_MAX_ITEMS),
  }
}

export function renderSourceLoaderResult(output: ValidatedSourceLoaderOutput): SourceLoaderResult {
  const result: SourceLoaderResult = { items: output.items }
  if (output.metadata !== undefined) result.metadata = output.metadata
  if (output.itemTemplate === undefined) return result

  const template = compileSourceTemplate(output.itemTemplate.inline, {
    location: "source result.itemTemplate.inline",
    slot: "item",
  })
  result.itemPresentation = output.items.map((item) => {
    try {
      return {
        inline: template.render(createSourceTemplateScope(undefined, { item })).trim(),
      }
    } catch (error) {
      reportTemplateError(error)
      return {}
    }
  })
  return result
}

function normalizeSourceLoaderResult(value: unknown): unknown {
  if (!isRecord(value) || !Array.isArray(value.items)) return value
  return {
    ...value,
    items: value.items.map(normalizeNewsItem),
  }
}

function normalizeNewsItem(value: unknown): unknown {
  if (!isRecord(value)) return value
  const item = withoutEmptyValues(value)

  for (const field of ["author", "stats", "attributes", "content"] as const) {
    const nested = item[field]
    if (!isRecord(nested)) continue
    const normalized = withoutEmptyValues(nested)
    if (field === "content" && Array.isArray(normalized.pictures) && normalized.pictures.length === 0) {
      delete normalized.pictures
    }
    if (field === "author" && normalized.name === undefined) delete item[field]
    else if (Object.keys(normalized).length === 0) delete item[field]
    else item[field] = normalized
  }
  for (const field of ["icon", "mark"] as const) {
    const picture = item[field]
    if (!isRecord(picture)) continue
    const normalized = withoutEmptyValues(picture)
    if (normalized.src === undefined) delete item[field]
    else item[field] = normalized
  }
  return item
}

function withoutEmptyValues(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null && entry !== ""),
  )
}

function assertSourceLoaderOutput(value: unknown): asserts value is ValidatedSourceLoaderOutput {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throwInvalidLoaderResult("expected an object containing an items array")
  }
  if (value.items.length === 0) {
    throwInvalidLoaderResult("No source items. Refresh to try again.")
  }
  value.items.forEach((item, index) => assertNewsItem(item, index))
  if (value.itemTemplate !== undefined) assertItemTemplate(value.itemTemplate)
  if (value.metadata !== undefined) assertSourceLoaderMetadata(value.metadata)
}

function assertNewsItem(value: unknown, index: number): void {
  const location = `items[${index}]`
  if (!isRecord(value)) throwInvalidLoaderResult(`${location} must be an object`)
  assertNonEmptyString(value.title, `${location}.title`)
  assertNonEmptyString(value.url, `${location}.url`)
  assertOptionalString(value.mobileUrl, `${location}.mobileUrl`)
  assertOptionalTimestamp(value.publishedAt, `${location}.publishedAt`)
  assertOptionalTimestamp(value.updatedAt, `${location}.updatedAt`)
  if (value.author !== undefined) assertAuthor(value.author, `${location}.author`)
  if (value.stats !== undefined) assertStats(value.stats, `${location}.stats`)
  if (value.attributes !== undefined) assertAttributes(value.attributes, `${location}.attributes`)
  if (value.icon !== undefined) assertSemanticPicture(value.icon, `${location}.icon`)
  if (value.mark !== undefined) assertSemanticPicture(value.mark, `${location}.mark`)
  if (value.content !== undefined) assertContent(value.content, `${location}.content`)
}

function assertAuthor(value: unknown, location: string): void {
  if (!isRecord(value)) throwInvalidLoaderResult(`${location} must be an object`)
  assertOnlyKeys(value, ["name", "home"], location)
  assertNonEmptyString(value.name, `${location}.name`)
  assertOptionalString(value.home, `${location}.home`)
}

function assertStats(value: unknown, location: string): void {
  if (!isRecord(value)) throwInvalidLoaderResult(`${location} must be an object`)
  assertOnlyKeys(value, NEWS_ITEM_STAT_KEYS, location)
  if (Object.keys(value).length === 0) throwInvalidLoaderResult(`${location} must not be empty`)
  for (const [key, stat] of Object.entries(value)) {
    if (!Number.isFinite(stat)) throwInvalidLoaderResult(`${location}.${key} must be a finite number`)
    if (key !== "score" && (stat as number) < 0) {
      throwInvalidLoaderResult(`${location}.${key} must not be negative`)
    }
  }
}

function assertAttributes(value: unknown, location: string): void {
  if (!isRecord(value)) throwInvalidLoaderResult(`${location} must be an object`)
  if (Object.keys(value).length === 0) throwInvalidLoaderResult(`${location} must not be empty`)
  for (const [key, attribute] of Object.entries(value)) {
    if (!key || ["__proto__", "constructor", "prototype"].includes(key)) {
      throwInvalidLoaderResult(`${location} contains an invalid key`)
    }
    if (!["boolean", "number", "string"].includes(typeof attribute)) {
      throwInvalidLoaderResult(`${location}.${key} must be a boolean, number, or string`)
    }
    if (typeof attribute === "number" && !Number.isFinite(attribute)) {
      throwInvalidLoaderResult(`${location}.${key} must be finite`)
    }
  }
}

function assertContent(value: unknown, location: string): void {
  if (!isRecord(value)) throwInvalidLoaderResult(`${location} must be an object`)
  assertOnlyKeys(value, ["text", "html", "pictures", "iframe"], location)
  assertOptionalString(value.text, `${location}.text`)
  assertOptionalString(value.html, `${location}.html`)
  if (hasContent(value.text) && hasContent(value.html)) {
    throwInvalidLoaderResult(`${location} cannot contain both text and html`)
  }
  if (value.pictures !== undefined) {
    const pictures = Array.isArray(value.pictures) ? value.pictures : [value.pictures]
    if (pictures.length === 0) throwInvalidLoaderResult(`${location}.pictures must not be empty`)
    pictures.forEach((picture, index) => {
      assertNonEmptyString(picture, `${location}.pictures[${index}]`)
    })
  }
  if (value.iframe !== undefined && typeof value.iframe !== "string" && !isRecord(value.iframe)) {
    throwInvalidLoaderResult(`${location}.iframe must be a string or object`)
  }
  if (![value.text, value.html, value.pictures, value.iframe].some(hasContent)) {
    throwInvalidLoaderResult(`${location} must contain text, html, pictures, or iframe`)
  }
}

function assertSemanticPicture(value: unknown, location: string): void {
  if (!isRecord(value)) throwInvalidLoaderResult(`${location} must be a picture object`)
  assertOnlyKeys(value, ["src", "kind", "label"], location)
  assertNonEmptyString(value.src, `${location}.src`)
  assertOptionalString(value.kind, `${location}.kind`)
  assertOptionalString(value.label, `${location}.label`)
}

function assertItemTemplate(value: unknown): void {
  if (!isRecord(value)) throwInvalidLoaderResult("itemTemplate must be an object")
  assertOnlyKeys(value, ["inline"], "itemTemplate")
  assertNonEmptyString(value.inline, "itemTemplate.inline")
  compileSourceTemplate(value.inline as string, {
    location: "source result.itemTemplate.inline",
    slot: "item",
  })
}

function assertSourceLoaderMetadata(value: unknown): void {
  if (!isRecord(value)) throwInvalidLoaderResult("metadata must be an object")
  for (const [key, metadataValue] of Object.entries(value)) {
    if (!isSourcePresentationMetadataKey(key)) {
      throwInvalidLoaderResult(`metadata.${key} is not supported`)
    }
    if (key === "type") {
      if (!isSourcePresentationType(metadataValue)) {
        throwInvalidLoaderResult("metadata.type must be \"list\" or \"ranking\"")
      }
      continue
    }
    assertNonEmptyString(metadataValue, `metadata.${key}`)
  }
}

function assertOnlyKeys(value: Record<string, unknown>, keys: readonly string[], location: string): void {
  const allowed = new Set(keys)
  const invalidKey = Object.keys(value).find(key => !allowed.has(key))
  if (invalidKey) throwInvalidLoaderResult(`${location}.${invalidKey} is not supported`)
}

function assertOptionalTimestamp(value: unknown, location: string): void {
  if (value !== undefined && !Number.isFinite(value)) {
    throwInvalidLoaderResult(`${location} must be a finite number`)
  }
}

function assertNonEmptyString(value: unknown, location: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throwInvalidLoaderResult(`${location} must be a non-empty string`)
  }
}

function assertOptionalString(value: unknown, location: string): void {
  if (value !== undefined && typeof value !== "string") {
    throwInvalidLoaderResult(`${location} must be a string`)
  }
}

function hasContent(value: unknown): boolean {
  return value !== undefined && value !== null && value !== ""
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function throwInvalidLoaderResult(message: string): never {
  throw new TypeError(`Invalid source loader result: ${message}`)
}
