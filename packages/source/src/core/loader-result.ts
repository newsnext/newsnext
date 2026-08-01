import type { NewsItem, SourceLoaderResult } from "../types"
import { isSourcePresentationMetadataKey } from "../types"

export function validateSourceLoaderResult(value: unknown): SourceLoaderResult {
  assertSourceLoaderResult(value)
  const items = value.items.map((item, index) => normalizeNewsItem(item, index))
  return items.every((item, index) => item === value.items[index])
    ? value
    : { ...value, items }
}

function assertSourceLoaderResult(value: unknown): asserts value is SourceLoaderResult {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throwInvalidLoaderResult("expected an object containing an items array")
  }
  if (value.items.length === 0) {
    throwInvalidLoaderResult("No source items. Refresh to try again.")
  }
  value.items.forEach((item, index) => assertNewsItem(item, index))
  if (value.metadata !== undefined) assertSourceLoaderMetadata(value.metadata)
}

function assertNewsItem(value: unknown, index: number): void {
  const location = `items[${index}]`
  if (!isRecord(value)) throwInvalidLoaderResult(`${location} must be an object`)
  assertNonEmptyString(value.title, `${location}.title`)
  assertNonEmptyString(value.url, `${location}.url`)
  assertOptionalString(value.mobileUrl, `${location}.mobileUrl`)
  if (value.timestamp !== undefined && !Number.isFinite(value.timestamp)) {
    throwInvalidLoaderResult(`${location}.timestamp must be a finite number`)
  }
}

function normalizeNewsItem(value: NewsItem, index: number): NewsItem {
  const location = `items[${index}]`
  const validInline = value.inline === undefined
    || isValidOptionalContent(value.inline, `${location}.inline`, assertInlineContent)
  const validPreview = value.preview === undefined
    || isValidOptionalContent(value.preview, `${location}.preview`, assertPreviewContent)
  if (validInline && validPreview) return value

  const { inline, preview, ...item } = value
  return {
    ...item,
    ...(validInline && inline !== undefined && { inline }),
    ...(validPreview && preview !== undefined && { preview }),
  }
}

function isValidOptionalContent(
  value: unknown,
  location: string,
  assertContent: (value: unknown, location: string) => void,
): boolean {
  try {
    assertContent(value, location)
    return true
  } catch (error) {
    if (error instanceof TypeError) return false
    throw error
  }
}

function assertInlineContent(value: unknown, location: string): void {
  if (!isRecord(value)) throwInvalidLoaderResult(`${location} must be an object`)
  assertOptionalString(value.text, `${location}.text`)
  assertOptionalString(value.html, `${location}.html`)
  if (value.icon !== undefined) assertPicture(value.icon, `${location}.icon`)
  if (value.mark !== undefined) {
    const marks = Array.isArray(value.mark) ? value.mark : [value.mark]
    if (marks.length === 0) throwInvalidLoaderResult(`${location}.mark must not be empty`)
    marks.forEach((mark, index) => assertPicture(mark, `${location}.mark[${index}]`))
  }
  if (![value.text, value.html, value.icon, value.mark].some(hasContent)) {
    throwInvalidLoaderResult(`${location} must contain text, html, icon, or mark`)
  }
}

function assertPreviewContent(value: unknown, location: string): void {
  if (!isRecord(value)) throwInvalidLoaderResult(`${location} must be an object`)
  const hasText = hasContent(value.text)
  const hasHtml = hasContent(value.html)
  if (hasText === hasHtml) {
    throwInvalidLoaderResult(`${location} must contain exactly one of text or html`)
  }
  assertOptionalString(value.text, `${location}.text`)
  assertOptionalString(value.html, `${location}.html`)
  if (value.picture !== undefined) {
    const pictures = Array.isArray(value.picture) ? value.picture : [value.picture]
    if (pictures.length === 0) throwInvalidLoaderResult(`${location}.picture must not be empty`)
    pictures.forEach((picture, index) => assertPicture(picture, `${location}.picture[${index}]`))
  }
  if (value.iframe !== undefined && typeof value.iframe !== "string" && !isRecord(value.iframe)) {
    throwInvalidLoaderResult(`${location}.iframe must be a string or object`)
  }
}

function assertPicture(value: unknown, location: string): void {
  if (typeof value === "string") {
    assertNonEmptyString(value, location)
    return
  }
  if (!isRecord(value)) throwInvalidLoaderResult(`${location} must be a string or picture object`)
  assertNonEmptyString(value.src, `${location}.src`)
  assertOptionalString(value.href, `${location}.href`)
  for (const key of ["radius", "scale"] as const) {
    if (value[key] !== undefined && !Number.isFinite(value[key])) {
      throwInvalidLoaderResult(`${location}.${key} must be a finite number`)
    }
  }
}

function assertSourceLoaderMetadata(value: unknown): void {
  if (!isRecord(value)) throwInvalidLoaderResult("metadata must be an object")
  for (const [key, metadataValue] of Object.entries(value)) {
    if (!isSourcePresentationMetadataKey(key)) {
      throwInvalidLoaderResult(`metadata.${key} is not supported`)
    }
    assertNonEmptyString(metadataValue, `metadata.${key}`)
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
