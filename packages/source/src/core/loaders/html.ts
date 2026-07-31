import type * as cheerio from "cheerio/slim"
import type { AnyNode } from "domhandler"
import type { FetchOptions } from "ofetch"
import type {
  HtmlField,
  HtmlFieldConfig,
  HtmlTraversal,
  NewsItem,
  SourceLoaderMetadata,
  SourceLoaderOutput,
  SourceTemplateVars,
} from "../../types"
import type {
  LoaderContext,
  LoaderFields,
  LoaderMetadataFields,
} from "./shared"
import { load } from "cheerio/slim"
import { sessionFetch } from "../../utils"
import {
  compileSourceTemplate,
  createSourceTemplateScope,
} from "../template"
import { normalizeLoaderMetadata } from "./shared"

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
  timestamp?: unknown
  inline?: Record<string, unknown>
  preview?: Record<string, unknown>
}

interface FieldEntry {
  config: HtmlFieldConfig
  htmlOutput: boolean
  path: readonly string[]
}

export interface HtmlLoaderOptions {
  url: string
  /**
   * CSS selector for the source items.
   */
  items?: string
  decoding?: string
  fetchOptions?: FetchOptions
  fetch?: (url: string) => Promise<string>
  metadata?: LoaderMetadataFields<HtmlField>
  fields: LoaderFields<HtmlField>
}

export function compileHtmlLoaderTemplates(
  options: Pick<HtmlLoaderOptions, "fields" | "metadata">,
  location: string,
): void {
  compileHtmlTemplates(collectFieldEntries(options.fields), `${location}.fields`)
  compileHtmlTemplates(collectMetadataEntries(options.metadata), `${location}.metadata`)
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
  if (fields.timestamp) {
    entries.push(createFieldEntry(["timestamp"], fields.timestamp))
  }

  for (const group of ["inline", "preview"] as const) {
    const fieldGroup = fields[group]
    if (!fieldGroup) continue
    for (const [key, field] of Object.entries(fieldGroup)) {
      if (field) {
        entries.push(createFieldEntry([group, key], field, key === "html"))
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
    fetchOptions,
    fetch,
    fields,
    metadata,
  } = options

  let html: string
  if (fetch) {
    html = await fetch(url)
  } else if (decoding && decoding.toLowerCase() !== "utf-8") {
    const response = await sessionFetch(url, {
      ...fetchOptions,
      responseType: "arrayBuffer",
    }) as ArrayBuffer
    html = new TextDecoder(decoding as ConstructorParameters<typeof TextDecoder>[0]).decode(response)
  } else {
    const res = await sessionFetch(url, fetchOptions)
    html = typeof res === "string" ? res : JSON.stringify(res)
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

    const timestamp = resolvedItem.timestamp === undefined
      || resolvedItem.timestamp === null
      || resolvedItem.timestamp === ""
      ? undefined
      : Number(resolvedItem.timestamp)
    if (timestamp !== undefined && Number.isFinite(timestamp)) item.timestamp = timestamp

    if (resolvedItem.inline && Object.values(resolvedItem.inline).some(hasValue)) {
      item.inline = omitEmpty(resolvedItem.inline) as NonNullable<NewsItem["inline"]>
    }
    if (resolvedItem.preview && Object.values(resolvedItem.preview).some(hasValue)) {
      item.preview = omitEmpty(resolvedItem.preview) as NonNullable<NewsItem["preview"]>
    }

    news.push(item)
  })

  if (!metadata) return news

  return {
    items: news,
    metadata: resolveHtmlMetadata($, metadata, {
      vars: loaderContext.vars ?? {},
      index: 0,
      params: loaderContext.params ?? {},
      requestUrl: url,
    }),
  }
}

function resolveHtmlMetadata(
  $: cheerio.CheerioAPI,
  metadata: NonNullable<HtmlLoaderOptions["metadata"]>,
  context: HtmlFieldContext,
): SourceLoaderMetadata | undefined {
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

function omitEmpty(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => hasValue(entry)))
}
