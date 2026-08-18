import type {
  NewsItem,
  SourceLoaderResult,
  SourcePresentationMetadata,
  SourceTemplateVars,
} from "../../types"
import type {
  LoaderContext,
  LoaderFields,
  LoaderMetadataFields,
  LoaderRequestOptions,
  TimestampSortableLoaderOptions,
} from "./shared"
import * as jmespath from "jmespath"
import {
  compileSourceTemplate,
  createSourceTemplateScope,
} from "../template"
import {
  isCompleteLoaderFieldGroup,
  normalizeLoaderMetadata,
  normalizeLoaderNestedValue,
  requestLoaderResponse,
  sortLoaderItemsByTimestamp,
} from "./shared"

const MAX_EXPRESSION_LENGTH = 2_000
const validatedExpressions = new Set<string>()
const blockedExpressionNames = new Set(["__proto__", "constructor", "prototype"])
const fieldTemplates = new WeakMap<JsonFieldConfig, ReturnType<typeof compileSourceTemplate>>()
const jmespathCompiler = jmespath as typeof jmespath & {
  compile: (expression: string) => unknown
}

interface JsonFieldContext {
  vars: SourceTemplateVars
  json: unknown
  index: number
  params: Record<string, unknown>
  requestUrl: string
}

export interface JsonFieldConfig {
  select?: string
  template?: string
}

export type JsonField = string | JsonFieldConfig

interface JsonFieldEntry {
  field: JsonField
  htmlOutput: boolean
  path: readonly string[]
}

interface JsonLoaderBaseOptions extends TimestampSortableLoaderOptions {
  url: string
  /**
   * Path to the array of items in the response JSON (e.g. "data.items").
   * If not provided, assumes the response itself is the array.
   */
  items?: string
  metadata?: LoaderMetadataFields<JsonField>
  itemTemplate?: SourceLoaderResult["itemTemplate"]
  fields: LoaderFields<JsonField>
}

export type JsonLoaderOptions = JsonLoaderBaseOptions & LoaderRequestOptions

export function compileJsonLoaderTemplates(
  options: Pick<JsonLoaderOptions, "fields" | "itemTemplate" | "metadata">,
  location: string,
): void {
  compileJsonTemplates(collectJsonFields(options.fields), `${location}.fields`)
  compileJsonTemplates(collectJsonMetadata(options.metadata), `${location}.metadata`)
  if (options.itemTemplate) {
    compileSourceTemplate(options.itemTemplate.inline, {
      location: `${location}.itemTemplate.inline`,
      slot: "item",
    })
  }
}

function compileJsonTemplates(entries: readonly JsonFieldEntry[], location: string): void {
  for (const { field, htmlOutput, path } of entries) {
    if (typeof field === "string" || !field.template) continue
    fieldTemplates.set(field, compileSourceTemplate(field.template, {
      location: `${location}.${path.join(".")}.template`,
      output: htmlOutput ? "html" : "plain",
      slot: "jsonField",
    }))
  }
}

function collectJsonMetadata(
  metadata: JsonLoaderOptions["metadata"],
): JsonFieldEntry[] {
  return Object.entries(metadata ?? {}).flatMap(([key, field]) => (
    field === undefined
      ? []
      : [{ field, htmlOutput: false, path: [key] }]
  ))
}

function selectJson(value: unknown, expression: string): unknown {
  validateJsonExpression(expression)
  return jmespath.search(value, expression)
}

export function validateJsonExpression(expression: string): void {
  if (validatedExpressions.has(expression)) return
  if (expression.length > MAX_EXPRESSION_LENGTH) {
    throw new Error(`JMESPath expression exceeds ${MAX_EXPRESSION_LENGTH} characters`)
  }

  const compiled = jmespathCompiler.compile(expression)
  assertSafeExpression(compiled)
  validatedExpressions.add(expression)
}

function assertSafeExpression(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(assertSafeExpression)
    return
  }
  if (!value || typeof value !== "object") {
    return
  }

  const node = value as Record<string, unknown>
  if (typeof node.name === "string" && blockedExpressionNames.has(node.name)) {
    throw new Error(`JMESPath property "${node.name}" is not allowed`)
  }
  Object.values(node).forEach(assertSafeExpression)
}

function resolveValue(
  item: unknown,
  context: JsonFieldContext,
  field: JsonField,
  escapeTemplateValues = false,
): unknown {
  if (typeof field === "string") {
    return selectJson(item, field)
  }

  const selected = field.select === undefined
    ? item
    : selectJson(item, field.select)
  if (!field.template) {
    return selected
  }

  return getJsonFieldTemplate(field, escapeTemplateValues).render(
    createSourceTemplateScope(context.vars, {
      index: context.index,
      item,
      params: context.params,
      request: {
        url: context.requestUrl,
      },
      response: {
        json: context.json,
      },
      value: selected ?? null,
    }),
  )
}

function collectJsonFields(
  fields: JsonLoaderOptions["fields"],
): JsonFieldEntry[] {
  const entries: JsonFieldEntry[] = [
    { field: fields.title, htmlOutput: false, path: ["title"] },
    { field: fields.url, htmlOutput: false, path: ["url"] },
  ]

  if (fields.mobileUrl) {
    entries.push({ field: fields.mobileUrl, htmlOutput: false, path: ["mobileUrl"] })
  }
  for (const fieldName of ["publishedAt", "updatedAt"] as const) {
    const field = fields[fieldName]
    if (field) entries.push({ field, htmlOutput: false, path: [fieldName] })
  }
  collectNestedJsonFields(entries, fields, ["author", "stats", "attributes", "icon", "mark", "content"])
  return entries
}

function collectNestedJsonFields(
  entries: JsonFieldEntry[],
  fields: LoaderFields<JsonField>,
  groups: readonly (keyof LoaderFields<JsonField>)[],
): void {
  for (const group of groups) {
    const value = fields[group]
    if (!value) continue
    for (const [key, field] of Object.entries(value)) {
      if (field) entries.push({ field, htmlOutput: group === "content" && key === "html", path: [group, key] })
    }
  }
}

function getJsonFieldTemplate(
  field: JsonFieldConfig,
  htmlOutput: boolean,
): ReturnType<typeof compileSourceTemplate> {
  const cached = fieldTemplates.get(field)
  if (cached) return cached

  const compiled = compileSourceTemplate(field.template ?? "", {
    location: "JSON field template",
    output: htmlOutput ? "html" : "plain",
    slot: "jsonField",
  })
  fieldTemplates.set(field, compiled)
  return compiled
}

export function resolveJsonMetadata(
  json: unknown,
  metadata: JsonLoaderOptions["metadata"],
  context: JsonFieldContext,
): SourcePresentationMetadata | undefined {
  return normalizeLoaderMetadata(Object.fromEntries(
    Object.entries(metadata ?? {}).flatMap(([key, field]) => (
      field === undefined ? [] : [[key, resolveValue(json, context, field)]]
    )),
  ))
}

export async function loadJson(
  options: JsonLoaderOptions,
  loaderContext: LoaderContext = {},
): Promise<SourceLoaderResult> {
  const { url, items: itemsSelect, fields, metadata } = options
  const response = await requestLoaderResponse(options, loaderContext)
  const json: unknown = await response.json()

  const metadataContext: JsonFieldContext = {
    vars: loaderContext.vars ?? {},
    json,
    index: 0,
    params: loaderContext.params ?? {},
    requestUrl: url,
  }
  const selectedItems = itemsSelect ? selectJson(json, itemsSelect) : json

  if (!Array.isArray(selectedItems)) {
    return {
      items: [],
      metadata: metadata
        ? resolveJsonMetadata(json, metadata, metadataContext)
        : undefined,
    }
  }

  const news: NewsItem[] = selectedItems.map((item, index) => {
    const fieldContext: JsonFieldContext = {
      vars: loaderContext.vars ?? {},
      json,
      index,
      params: loaderContext.params ?? {},
      requestUrl: url,
    }
    const titleValue = resolveValue(item, fieldContext, fields.title)
    const itemUrlValue = resolveValue(item, fieldContext, fields.url)

    if (!titleValue || !itemUrlValue) return null

    const newsItem: NewsItem = {
      title: String(titleValue),
      url: String(itemUrlValue),
    }

    if (fields.mobileUrl) {
      const mobileUrl = resolveValue(item, fieldContext, fields.mobileUrl)
      if (mobileUrl) newsItem.mobileUrl = String(mobileUrl)
    }

    assignResolvedJsonFields(newsItem, fields, item, fieldContext)

    return newsItem
  }).filter((i): i is NewsItem => i !== null)

  const sortedNews = sortLoaderItemsByTimestamp(news, options.sortByTimestamp)
  return {
    items: sortedNews,
    itemTemplate: options.itemTemplate,
    metadata: metadata ? resolveJsonMetadata(json, metadata, metadataContext) : undefined,
  }
}

function assignResolvedJsonFields(
  newsItem: NewsItem,
  fields: LoaderFields<JsonField>,
  input: unknown,
  context: JsonFieldContext,
): void {
  for (const fieldName of ["publishedAt", "updatedAt"] as const) {
    const field = fields[fieldName]
    if (!field) continue
    const value = resolveValue(input, context, field)
    const timestamp = value === undefined || value === null || value === "" ? undefined : Number(value)
    if (timestamp !== undefined && Number.isFinite(timestamp)) newsItem[fieldName] = timestamp
  }
  for (const group of ["author", "stats", "attributes", "icon", "mark", "content"] as const) {
    const fieldGroup = fields[group]
    if (!fieldGroup) continue
    const resolved = Object.fromEntries(Object.entries(fieldGroup).flatMap(([key, field]) => {
      const rawValue = resolveValue(input, context, field as JsonField, group === "content" && key === "html")
      const value = normalizeLoaderNestedValue(group, rawValue)
      return value === undefined || value === null || value === "" ? [] : [[key, value]]
    }))
    if (isCompleteLoaderFieldGroup(group, resolved)) Object.assign(newsItem, { [group]: resolved })
  }
}
