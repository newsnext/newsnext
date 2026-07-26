import type * as cheerio from "cheerio/slim"
import type { AnyNode } from "domhandler"
import type { FetchOptions } from "ofetch"
import type {
  NewsItem,
  RuntimeSource,
} from "../../typings/sources"
import type { SourceFieldTransform } from "./fields"
import { load } from "cheerio/slim"
import { myFetch } from "../fetch"
import { renderHtmlTemplate, renderTemplate } from "../template"
import { applyFieldTransforms, normalizeTimestamp } from "./fields"

const MAX_SELECTED_ITEMS = 2_000

export interface HtmlFieldResolverContext {
  index: number
  params: Record<string, unknown>
  requestUrl: string
}

export type FieldTransform<T = unknown>
  = (
    value: string | undefined,
    element: cheerio.Cheerio<AnyNode>,
    context: HtmlFieldResolverContext,
  ) => T | undefined

export type HtmlTraversal
  = { type: "closest", selector: string }
    | { type: "next", selector?: string }
    | { type: "parent" }
    | { type: "previous", selector?: string }
    | { type: "siblings", selector?: string }

export interface HtmlFieldConfig<T = unknown> {
  /**
   * CSS selector relative to the item. An array provides ordered fallbacks.
   * An empty or omitted selector targets the item itself.
   */
  selector?: string | readonly string[]
  /**
   * Select from the entire document instead of the current item.
   */
  scope?: "document" | "item"
  /**
   * Traverse from the selected scope before applying the field selector.
   */
  traverse?: HtmlTraversal | readonly HtmlTraversal[]
  /**
   * Attribute to extract. By default, the field extracts text.
   */
  attr?: string
  /**
   * Extract text, inner HTML, or outer HTML.
   */
  content?: "html" | "outerHtml" | "text"
  /**
   * Extract every match and join the values. The default separator is empty.
   */
  all?: boolean
  separator?: string
  template?: string
  transforms?: SourceFieldTransform[]
  /**
   * Internal escape hatch for built-in sources with unusual DOM relationships.
   */
  transform?: FieldTransform<T>
}

export type FieldSelector<T = unknown> = string | HtmlFieldConfig<T>
export type ItemsResolver = string | (($: cheerio.CheerioAPI) => cheerio.Cheerio<AnyNode> | AnyNode[])
export type ItemFilter = string | ((el: cheerio.Cheerio<AnyNode>, index: number, $: cheerio.CheerioAPI) => boolean)

export interface HtmlSourceLoaderContext {
  params?: Record<string, unknown>
}

interface HtmlTemplateContext extends HtmlFieldResolverContext {
  item: HtmlExtractedItem
  value: unknown
}

interface HtmlExtractedItem {
  title?: unknown
  url?: unknown
  mobileUrl?: unknown
  timestamp?: unknown
  inline?: Record<string, unknown>
  preview?: Record<string, unknown>
}

interface FieldEntry {
  config: HtmlFieldConfig
  htmlOutput: boolean
  path: readonly string[]
}

export interface HtmlSourceOptions {
  url: string
  type?: RuntimeSource["type"]
  /**
   * Selector or resolver for the source items.
   */
  items?: ItemsResolver
  filter?: ItemFilter
  // Allow dynamic decoding
  decoding?: string
  fetchOptions?: FetchOptions
  fetch?: (url: string) => Promise<string>
  fields: {
    title: FieldSelector<string>
    url: FieldSelector<string>
    mobileUrl?: FieldSelector<string>
    timestamp?: FieldSelector<number>
    inline?: {
      text?: FieldSelector<string>
      html?: FieldSelector<string>
      mark?: FieldSelector<NonNullable<NewsItem["inline"]>["mark"]>
      icon?: FieldSelector<NonNullable<NewsItem["inline"]>["icon"]>
    }
    preview?: {
      text?: FieldSelector<string>
      html?: FieldSelector<string>
      picture?: FieldSelector<NonNullable<NewsItem["preview"]>["picture"]>
      iframe?: FieldSelector<NonNullable<NewsItem["preview"]>["iframe"]>
    }
  }
}

function resolveFieldSelector(selectorConfig: FieldSelector): HtmlFieldConfig {
  return typeof selectorConfig === "object"
    ? selectorConfig
    : { selector: selectorConfig }
}

function collectFieldEntries(fields: HtmlSourceOptions["fields"]): FieldEntry[] {
  const entries: FieldEntry[] = [
    createFieldEntry(["title"], fields.title),
    createFieldEntry(["url"], fields.url),
  ]

  if (fields.mobileUrl) {
    entries.push(createFieldEntry(["mobileUrl"], fields.mobileUrl))
  }
  if (fields.timestamp) {
    entries.push(createFieldEntry(["timestamp"], fields.timestamp))
  }

  for (const group of ["inline", "preview"] as const) {
    const fieldGroup = fields[group]
    if (!fieldGroup) continue
    for (const [key, resolver] of Object.entries(fieldGroup)) {
      if (resolver) {
        entries.push(createFieldEntry([group, key], resolver, key === "html"))
      }
    }
  }

  return entries
}

function createFieldEntry(
  path: readonly string[],
  resolver: FieldSelector,
  htmlOutput = false,
): FieldEntry {
  return {
    config: resolveFieldSelector(resolver),
    htmlOutput,
    path,
  }
}

function extractField(
  $: cheerio.CheerioAPI,
  element: AnyNode,
  config: HtmlFieldConfig,
  context: HtmlFieldResolverContext,
): unknown {
  const target = selectTarget($, element, config)
  const values = config.all
    ? target.toArray().map(node => extractNodeValue($, $(node), config))
    : [extractNodeValue($, target.first(), config)]
  const value = config.all
    ? values.filter((entry): entry is string => entry !== undefined).join(config.separator ?? "")
    : values[0]

  if (config.transform) {
    return config.transform(value, target, context)
  }

  return applyFieldTransforms(value, config.transforms, {
    requestUrl: context.requestUrl,
  })
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
  const selectors = typeof config.selector === "string"
    ? [config.selector]
    : config.selector ?? [""]

  for (const selector of selectors) {
    const target = selector ? root.find(selector) : root
    if (target.length > 0) return target
  }

  return $([])
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
      return target.text().trim()
  }
}

function resolveField(
  entry: FieldEntry,
  extractedItem: HtmlExtractedItem,
  context: HtmlFieldResolverContext,
): unknown {
  const value = getPath(extractedItem, entry.path)
  if (entry.config.transform || !entry.config.template) return value

  const templateContext = {
    ...context,
    item: extractedItem,
    value,
  } satisfies HtmlTemplateContext

  return entry.htmlOutput
    ? renderHtmlTemplate(entry.config.template, templateContext)
    : renderTemplate(entry.config.template, templateContext)
}

export async function loadHtml(
  opts: HtmlSourceOptions,
  loaderContext: HtmlSourceLoaderContext = {},
): Promise<NewsItem[]> {
  const { url, type, items: itemsResolver, filter, decoding, fetchOptions, fetch, fields } = opts

  let html: string
  if (fetch) {
    html = await fetch(url)
  } else if (decoding && decoding.toLowerCase() !== "utf-8") {
    const response = await myFetch(url, { ...fetchOptions, responseType: "arrayBuffer" }) as ArrayBuffer
    html = new TextDecoder(decoding as ConstructorParameters<typeof TextDecoder>[0]).decode(response)
  } else {
    const res = await myFetch(url, fetchOptions)
    html = typeof res === "string" ? res : JSON.stringify(res)
  }

  const $ = load(html)
  const items = resolveItems($, itemsResolver).slice(0, MAX_SELECTED_ITEMS)
  const entries = collectFieldEntries(fields)
  const news: NewsItem[] = []

  items.forEach((element, index) => {
    const $item = $(element)
    if (filter && !matchesFilter($item, index, $, filter)) return

    const context: HtmlFieldResolverContext = {
      index,
      params: loaderContext.params ?? {},
      requestUrl: url,
    }
    const extractedItem: HtmlExtractedItem = {}

    for (const entry of entries) {
      setPath(extractedItem, entry.path, extractField($, element, entry.config, context))
    }

    const resolvedItem: HtmlExtractedItem = {}
    for (const entry of entries) {
      setPath(resolvedItem, entry.path, resolveField(entry, extractedItem, context))
    }

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

    const timestamp = normalizeTimestamp(resolvedItem.timestamp)
    if (timestamp !== undefined) item.timestamp = timestamp

    if (resolvedItem.inline && Object.values(resolvedItem.inline).some(hasValue)) {
      item.inline = omitEmpty(resolvedItem.inline) as NonNullable<NewsItem["inline"]>
    }
    if (resolvedItem.preview && Object.values(resolvedItem.preview).some(hasValue)) {
      item.preview = omitEmpty(resolvedItem.preview) as NonNullable<NewsItem["preview"]>
    }

    news.push(item)
  })

  if (type !== "hottest" && news.length > 0 && news[0].timestamp) {
    news.sort((a, b) => (b.timestamp as number) - (a.timestamp as number))
  }

  return news
}

function resolveItems(
  $: cheerio.CheerioAPI,
  resolver: ItemsResolver | undefined,
): AnyNode[] {
  if (!resolver) return []
  if (typeof resolver === "function") {
    const resolved = resolver($)
    return Array.isArray(resolved) ? resolved : resolved.toArray()
  }
  return $(resolver).toArray()
}

function matchesFilter(
  element: cheerio.Cheerio<AnyNode>,
  index: number,
  $: cheerio.CheerioAPI,
  filter: ItemFilter,
): boolean {
  return typeof filter === "function"
    ? filter(element, index, $)
    : element.is(filter)
}

function getPath(value: HtmlExtractedItem, path: readonly string[]): unknown {
  let current: unknown = value
  for (const key of path) {
    if (!current || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

function setPath(
  value: HtmlExtractedItem,
  path: readonly string[],
  fieldValue: unknown,
): void {
  let current = value as Record<string, unknown>
  for (const key of path.slice(0, -1)) {
    const child = current[key]
    if (!child || typeof child !== "object") {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }
  current[path.at(-1) as string] = fieldValue
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== ""
}

function omitEmpty(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => hasValue(entry)))
}
