import type * as cheerio from "cheerio/slim"
import type { AnyNode } from "domhandler"
import type {
  HtmlField,
  HtmlFieldConfig,
  HtmlTraversal,
  NewsItem,
  SourceLoaderOutput,
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
import { load } from "cheerio/slim"
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

const MAX_SELECTED_ITEMS = 2_000
const fieldTemplates = new WeakMap<HtmlFieldConfig, ReturnType<typeof compileSourceTemplate>>()

interface HtmlFieldContext {
  vars: SourceTemplateVars
  index: number
  params: Record<string, unknown>
  requestUrl: string
}

export type { HtmlField, HtmlFieldConfig, HtmlTraversal } from "../../types"

interface HtmlExtractedItem {
  title?: unknown
  url?: unknown
  mobileUrl?: unknown
  publishedAt?: unknown
  updatedAt?: unknown
  author?: Record<string, unknown>
  stats?: Record<string, unknown>
  attributes?: Record<string, unknown>
  icon?: Record<string, unknown>
  mark?: Record<string, unknown>
  content?: Record<string, unknown>
}

interface FieldEntry {
  config: HtmlFieldConfig
  htmlOutput: boolean
  path: readonly string[]
}

interface HtmlLoaderBaseOptions extends TimestampSortableLoaderOptions {
  url: string
  /**
   * CSS selector for the source items.
   */
  items?: string
  decoding?: string
  metadata?: LoaderMetadataFields<HtmlField>
  itemTemplate?: SourceLoaderOutput["itemTemplate"]
  fields: LoaderFields<HtmlField>
}

export type HtmlLoaderOptions = HtmlLoaderBaseOptions & LoaderRequestOptions

export function compileHtmlLoaderTemplates(
  options: Pick<HtmlLoaderOptions, "fields" | "itemTemplate" | "metadata">,
  location: string,
): void {
  compileHtmlTemplates(collectFieldEntries(options.fields), `${location}.fields`)
  compileHtmlTemplates(collectMetadataEntries(options.metadata), `${location}.metadata`)
  if (options.itemTemplate) {
    compileSourceTemplate(options.itemTemplate.inline, {
      location: `${location}.itemTemplate.inline`,
      slot: "item",
    })
  }
}

function compileHtmlTemplates(
  entries: readonly FieldEntry[],
  location: string,
): void {
  for (const entry of entries) {
    if (!entry.config.template) continue
    fieldTemplates.set(entry.config, compileSourceTemplate(entry.config.template, {
      location: `${location}.${entry.path.join(".")}.template`,
      output: entry.htmlOutput ? "html" : "plain",
      slot: "field",
    }))
  }
}

function resolveFieldConfig(field: HtmlField): HtmlFieldConfig {
  return typeof field === "object"
    ? field
    : { select: field }
}

function collectFieldEntries(fields: HtmlLoaderOptions["fields"]): FieldEntry[] {
  const entries: FieldEntry[] = [
    createFieldEntry(["title"], fields.title),
    createFieldEntry(["url"], fields.url),
  ]

  if (fields.mobileUrl) {
    entries.push(createFieldEntry(["mobileUrl"], fields.mobileUrl))
  }
  for (const fieldName of ["publishedAt", "updatedAt"] as const) {
    const field = fields[fieldName]
    if (field) entries.push(createFieldEntry([fieldName], field))
  }
  for (const group of ["author", "stats", "attributes", "icon", "mark", "content"] as const) {
    const fieldGroup = fields[group]
    if (!fieldGroup) continue
    for (const [key, field] of Object.entries(fieldGroup)) {
      if (field) {
        entries.push(createFieldEntry([group, key], field, group === "content" && key === "html"))
      }
    }
  }

  return entries
}

function collectMetadataEntries(metadata: HtmlLoaderOptions["metadata"]): FieldEntry[] {
  return Object.entries(metadata ?? {}).flatMap(([key, field]) => (
    field === undefined ? [] : [createFieldEntry([key], field)]
  ))
}

function createFieldEntry(
  path: readonly string[],
  field: HtmlField,
  htmlOutput = false,
): FieldEntry {
  return {
    config: resolveFieldConfig(field),
    htmlOutput,
    path,
  }
}

function extractField(
  $: cheerio.CheerioAPI,
  element: AnyNode,
  config: HtmlFieldConfig,
): unknown {
  const target = selectTarget($, element, config)
  const values = config.all
    ? target.toArray().map(node => extractNodeValue($, $(node), config))
    : [extractNodeValue($, target.first(), config)]
  const value = config.all
    ? values.filter((entry): entry is string => entry !== undefined).join(config.separator ?? "")
    : values[0]

  return value
}

function selectTarget(
  $: cheerio.CheerioAPI,
  element: AnyNode,
  config: HtmlFieldConfig,
): cheerio.Cheerio<AnyNode> {
  const initialRoot = config.scope === "document" ? $.root() : $(element)
  const traversals = config.traverse
    ? (Array.isArray(config.traverse) ? config.traverse : [config.traverse])
    : []
  const root = traversals.reduce<cheerio.Cheerio<AnyNode>>(
    (current, traversal) => traverse(current, traversal),
    initialRoot,
  )
  const selectors = typeof config.select === "string"
    ? [config.select]
    : config.select ?? [""]

  for (const selector of selectors) {
    const target = selector ? root.find(selector) : root
    if (target.length > 0) return target
  }

  return root.slice(0, 0)
}

function traverse(
  element: cheerio.Cheerio<AnyNode>,
  traversal: HtmlTraversal,
): cheerio.Cheerio<AnyNode> {
  switch (traversal.type) {
    case "closest":
      return element.closest(traversal.selector)
    case "next":
      return traversal.selector
        ? element.next(traversal.selector)
        : element.next()
    case "parent":
      return element.parent()
    case "previous":
      return traversal.selector
        ? element.prev(traversal.selector)
        : element.prev()
    case "siblings":
      return traversal.selector
        ? element.siblings(traversal.selector)
        : element.siblings()
  }
}

function extractNodeValue(
  $: cheerio.CheerioAPI,
  target: cheerio.Cheerio<AnyNode>,
  config: HtmlFieldConfig,
): string | undefined {
  if (target.length === 0) return undefined
  if (config.attr) return target.attr(config.attr)

  switch (config.content) {
    case "html":
      return target.html() ?? undefined
    case "outerHtml":
      return $.html(target)
    case "text":
    case undefined:
      if (config.brSeparator === undefined) {
        return target.text().trim()
      }
      return target
        .clone()
        .find("br")
        .replaceWith(config.brSeparator)
        .end()
        .text()
        .trim()
  }
}

function resolveField(
  entry: FieldEntry,
  extractedFields: Record<string, unknown>,
  context: HtmlFieldContext,
): unknown {
  const value = getPath(extractedFields, entry.path)
  if (!entry.config.template) return value

  return getHtmlFieldTemplate(entry).render(
    createSourceTemplateScope(context.vars, {
      index: context.index,
      item: extractedFields,
      params: context.params,
      request: {
        url: context.requestUrl,
      },
      value: value ?? null,
    }),
  )
}

function getHtmlFieldTemplate(
  entry: FieldEntry,
): ReturnType<typeof compileSourceTemplate> {
  const cached = fieldTemplates.get(entry.config)
  if (cached) return cached

  const compiled = compileSourceTemplate(entry.config.template ?? "", {
    location: `HTML field ${entry.path.join(".")}.template`,
    output: entry.htmlOutput ? "html" : "plain",
    slot: "field",
  })
  fieldTemplates.set(entry.config, compiled)
  return compiled
}

export async function loadHtml(
  options: HtmlLoaderOptions,
  loaderContext: LoaderContext = {},
): Promise<SourceLoaderOutput> {
  const {
    url,
    items: itemsSelect,
    decoding,
    fields,
    metadata,
  } = options
  const response = await requestLoaderResponse(options, loaderContext)

  let html: string
  if (decoding && decoding.toLowerCase() !== "utf-8") {
    const data = await response.arrayBuffer()
    html = new TextDecoder(decoding as ConstructorParameters<typeof TextDecoder>[0]).decode(data)
  } else {
    html = await response.text()
  }

  const $ = load(html)
  const items = itemsSelect
    ? $(itemsSelect).toArray().slice(0, MAX_SELECTED_ITEMS)
    : []
  const entries = collectFieldEntries(fields)
  const news: NewsItem[] = []

  items.forEach((element, index) => {
    const fieldContext: HtmlFieldContext = {
      vars: loaderContext.vars ?? {},
      index,
      params: loaderContext.params ?? {},
      requestUrl: url,
    }
    const resolvedItem = extractAndResolveFields(
      $,
      element,
      entries,
      fieldContext,
    ) as HtmlExtractedItem

    const title = resolvedItem.title
    const itemUrl = resolvedItem.url
    if (!title || !itemUrl) return

    const item: NewsItem = {
      title: String(title),
      url: String(itemUrl),
    }

    if (resolvedItem.mobileUrl) {
      item.mobileUrl = String(resolvedItem.mobileUrl)
    }

    for (const fieldName of ["publishedAt", "updatedAt"] as const) {
      const rawValue = resolvedItem[fieldName]
      const timestamp = rawValue === undefined || rawValue === null || rawValue === ""
        ? undefined
        : Number(rawValue)
      if (timestamp !== undefined && Number.isFinite(timestamp)) item[fieldName] = timestamp
    }
    for (const group of ["author", "stats", "attributes", "icon", "mark", "content"] as const) {
      const value = resolvedItem[group]
      if (value && Object.values(value).some(hasValue)) {
        const normalized = Object.fromEntries(Object.entries(value).flatMap(([key, rawValue]) => {
          const nextValue = normalizeLoaderNestedValue(group, rawValue)
          return hasValue(nextValue) ? [[key, nextValue]] : []
        }))
        if (isCompleteLoaderFieldGroup(group, normalized)) Object.assign(item, { [group]: normalized })
      }
    }

    news.push(item)
  })

  const sortedNews = sortLoaderItemsByTimestamp(news, options.sortByTimestamp)
  return {
    items: sortedNews,
    itemTemplate: options.itemTemplate,
    metadata: metadata
      ? resolveHtmlMetadata($, metadata, {
          vars: loaderContext.vars ?? {},
          index: 0,
          params: loaderContext.params ?? {},
          requestUrl: url,
        })
      : undefined,
  }
}

function resolveHtmlMetadata(
  $: cheerio.CheerioAPI,
  metadata: NonNullable<HtmlLoaderOptions["metadata"]>,
  context: HtmlFieldContext,
): SourcePresentationMetadata | undefined {
  const root = $.root().get(0)
  if (!root) return undefined

  const resolved = extractAndResolveFields(
    $,
    root,
    collectMetadataEntries(metadata),
    context,
  )
  return normalizeLoaderMetadata(resolved)
}

function extractAndResolveFields(
  $: cheerio.CheerioAPI,
  root: AnyNode,
  entries: readonly FieldEntry[],
  context: HtmlFieldContext,
): Record<string, unknown> {
  const extracted: Record<string, unknown> = {}
  for (const entry of entries) {
    setPath(extracted, entry.path, extractField($, root, entry.config))
  }

  const resolved: Record<string, unknown> = {}
  for (const entry of entries) {
    setPath(resolved, entry.path, resolveField(entry, extracted, context))
  }
  return resolved
}

function getPath(value: Record<string, unknown>, path: readonly string[]): unknown {
  let current: unknown = value
  for (const key of path) {
    if (!current || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

function setPath(
  value: Record<string, unknown>,
  path: readonly string[],
  fieldValue: unknown,
): void {
  let current = value
  for (const key of path.slice(0, -1)) {
    const child = current[key]
    if (!child || typeof child !== "object") {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }
  const field = path.at(-1)
  if (field !== undefined) current[field] = fieldValue
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== ""
}
