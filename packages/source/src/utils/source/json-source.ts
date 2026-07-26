import type { FetchOptions } from "ofetch"
import type {
  NewsItem,
  RuntimeSource,
} from "../../typings/sources"
import type { SourceFieldTransform } from "./fields"
import * as jmespath from "jmespath"
import { myFetch } from "../fetch"
import { renderHtmlTemplate, renderTemplate } from "../template"
import { applyFieldTransforms, normalizeTimestamp } from "./fields"

const MAX_EXPRESSION_LENGTH = 2_000
const validatedExpressions = new Set<string>()
const blockedExpressionNames = new Set(["__proto__", "constructor", "prototype"])
const jmespathCompiler = jmespath as typeof jmespath & {
  compile: (expression: string) => unknown
}

export interface JsonFieldResolverContext {
  json: unknown
  index: number
  params: Record<string, unknown>
  requestUrl: string
}

export interface JsonFieldConfig {
  select?: string
  template?: string
  transforms?: SourceFieldTransform[]
}

export type FieldResolver<Item = unknown, Result = unknown>
  = string
    | JsonFieldConfig
    | ((item: Item, context: JsonFieldResolverContext) => Result | null | undefined)

interface JsonTemplateContext<Item> extends JsonFieldResolverContext {
  item: Item
}

export interface JsonSourceLoaderContext {
  params?: Record<string, unknown>
}

export interface JsonSourceOptions<Item = unknown> {
  url: string
  type?: RuntimeSource["type"]
  /**
   * Path to the array of items in the response JSON (e.g. "data.items").
   * OR a function that returns the items array from the JSON.
   * OR a function that returns the path string (for dynamic paths).
   *
   * If not provided, assumes the response itself is the array.
   */
  items?: string | ((json: any) => Item[] | string)
  /**
   * Custom fetch function
   */
  fetchOptions?: FetchOptions
  fetch?: (url: string) => Promise<unknown>
  fields: {
    title: FieldResolver<Item, string>
    url: FieldResolver<Item, string>
    mobileUrl?: FieldResolver<Item, string>
    timestamp?: FieldResolver<Item, number>
    inline?: {
      text?: FieldResolver<Item, string>
      html?: FieldResolver<Item, string>
      mark?: FieldResolver<Item, NonNullable<NewsItem["inline"]>["mark"]>
      icon?: FieldResolver<Item, NonNullable<NewsItem["inline"]>["icon"]>
    }
    preview?: {
      text?: FieldResolver<Item, string>
      html?: FieldResolver<Item, string>
      picture?: FieldResolver<Item, NonNullable<NewsItem["preview"]>["picture"]>
      iframe?: FieldResolver<Item, NonNullable<NewsItem["preview"]>["iframe"]>
    }
  }
}

export function selectJson(value: unknown, expression: string): unknown {
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

function resolveValue<Item>(
  item: Item,
  context: JsonFieldResolverContext,
  resolver: FieldResolver<Item>,
  escapeTemplateValues = false,
): unknown {
  if (typeof resolver === "function") {
    return resolver(item, context)
  }

  if (typeof resolver === "string") {
    return selectJson(item, resolver)
  }

  const selected = resolver.select === undefined
    ? item
    : selectJson(item, resolver.select)
  const value = applyFieldTransforms(selected, resolver.transforms, {
    requestUrl: context.requestUrl,
  })
  if (!resolver.template) {
    return value
  }

  const templateContext = {
    item,
    value,
    ...context,
  } satisfies JsonTemplateContext<Item> & { value: unknown }
  return escapeTemplateValues
    ? renderHtmlTemplate(resolver.template, templateContext)
    : renderTemplate(resolver.template, templateContext)
}

export async function loadJson<Item = unknown>(
  opts: JsonSourceOptions<Item>,
  loaderContext: JsonSourceLoaderContext = {},
): Promise<NewsItem[]> {
  const { url, type, fetchOptions, fetch, items: itemsResolver, fields } = opts

  let json: unknown
  if (fetch) {
    json = await fetch(url)
  } else {
    json = await myFetch(url, fetchOptions)
  }

  let items: Item[] = []
  if (itemsResolver) {
    if (typeof itemsResolver === "function") {
      const res = itemsResolver(json)
      if (typeof res === "string") {
        items = selectJson(json, res) as Item[]
      } else {
        items = res
      }
    } else if (typeof itemsResolver === "string") {
      items = selectJson(json, itemsResolver) as Item[]
    }
  } else {
    items = Array.isArray(json) ? json : []
  }

  if (!Array.isArray(items)) {
    // Fallback or just empty
    return []
  }

  const news: NewsItem[] = items.map((item, index) => {
    const context: JsonFieldResolverContext = {
      json,
      index,
      params: loaderContext.params ?? {},
      requestUrl: url,
    }
    const titleValue = resolveValue(item, context, fields.title)
    const itemUrlValue = resolveValue(item, context, fields.url)

    if (!titleValue || !itemUrlValue) return null

    const newsItem: NewsItem = {
      title: String(titleValue),
      url: String(itemUrlValue),
    }

    if (fields.mobileUrl) {
      const mobileUrl = resolveValue(item, context, fields.mobileUrl)
      if (mobileUrl) newsItem.mobileUrl = String(mobileUrl)
    }

    if (fields.timestamp) {
      const timestamp = normalizeTimestamp(resolveValue(item, context, fields.timestamp))
      if (timestamp !== undefined) newsItem.timestamp = timestamp
    }

    if (fields.inline) {
      const inline: Record<string, unknown> = {}
      for (const [key, resolver] of Object.entries(fields.inline)) {
        const val = resolveValue(item, context, resolver as FieldResolver<Item>, key === "html")
        if (val != null) {
          Object.assign(inline, { [key]: val })
        }
      }
      if (Object.keys(inline).length > 0) {
        newsItem.inline = inline as NonNullable<NewsItem["inline"]>
      }
    }

    if (fields.preview) {
      const preview: Record<string, unknown> = {}
      for (const [key, resolver] of Object.entries(fields.preview)) {
        const val = resolveValue(item, context, resolver as FieldResolver<Item>, key === "html")
        if (val != null) {
          Object.assign(preview, { [key]: val })
        }
      }
      if (Object.keys(preview).length > 0) {
        newsItem.preview = preview as NonNullable<NewsItem["preview"]>
      }
    }

    return newsItem
  }).filter((i): i is NewsItem => i !== null)

  if (type !== "hottest" && news.length > 0 && news[0].timestamp) {
    news.sort((a, b) => (b.timestamp as number) - (a.timestamp as number))
  }

  return news
}
