import type { FetchOptions } from "ofetch"
import type {
  NewsItem,
  RuntimeSource,
  SourceTemplateVars,
} from "../../types"
import * as jmespath from "jmespath"
import { myFetch } from "../../utils"
import {
  compileSourceTemplate,
  createSourceTemplateScope,
} from "../template"

const MAX_EXPRESSION_LENGTH = 2_000
const validatedExpressions = new Set<string>()
const blockedExpressionNames = new Set(["__proto__", "constructor", "prototype"])
const fieldTemplates = new WeakMap<JsonFieldConfig, ReturnType<typeof compileSourceTemplate>>()
const jmespathCompiler = jmespath as typeof jmespath & {
  compile: (expression: string) => unknown
}

export interface JsonFieldContext {
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

export interface JsonSourceLoaderContext {
  vars?: SourceTemplateVars
  params?: Record<string, unknown>
}

export interface JsonSourceOptions {
  url: string
  type?: RuntimeSource["type"]
  /**
   * Path to the array of items in the response JSON (e.g. "data.items").
   * If not provided, assumes the response itself is the array.
   */
  items?: string
  /**
   * Custom fetch function
   */
  fetchOptions?: FetchOptions
  fetch?: (url: string) => Promise<unknown>
  fields: {
    title: JsonField
    url: JsonField
    mobileUrl?: JsonField
    timestamp?: JsonField
    inline?: {
      text?: JsonField
      html?: JsonField
      mark?: JsonField
      icon?: JsonField
    }
    preview?: {
      text?: JsonField
      html?: JsonField
      picture?: JsonField
      iframe?: JsonField
    }
  }
}

export function compileJsonFieldTemplates(
  fields: JsonSourceOptions["fields"],
  location: string,
): void {
  for (const { field, htmlOutput, path } of collectJsonFields(fields)) {
    if (typeof field === "string" || !field.template) continue
    fieldTemplates.set(field, compileSourceTemplate(field.template, {
      location: `${location}.${path.join(".")}.template`,
      output: htmlOutput ? "html" : "plain",
      slot: "jsonField",
    }))
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
  fields: JsonSourceOptions["fields"],
): Array<{ field: JsonField, htmlOutput: boolean, path: readonly string[] }> {
  const entries: Array<{
    field: JsonField
    htmlOutput: boolean
    path: readonly string[]
  }> = [
    { field: fields.title, htmlOutput: false, path: ["title"] },
    { field: fields.url, htmlOutput: false, path: ["url"] },
  ]

  if (fields.mobileUrl) {
    entries.push({ field: fields.mobileUrl, htmlOutput: false, path: ["mobileUrl"] })
  }
  if (fields.timestamp) {
    entries.push({ field: fields.timestamp, htmlOutput: false, path: ["timestamp"] })
  }
  for (const group of ["inline", "preview"] as const) {
    for (const [key, field] of Object.entries(fields[group] ?? {})) {
      if (field) {
        entries.push({
          field,
          htmlOutput: key === "html",
          path: [group, key],
        })
      }
    }
  }
  return entries
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

export async function loadJson(
  opts: JsonSourceOptions,
  loaderContext: JsonSourceLoaderContext = {},
): Promise<NewsItem[]> {
  const { url, type, fetchOptions, fetch, items: itemsSelect, fields } = opts

  let json: unknown
  if (fetch) {
    json = await fetch(url)
  } else {
    json = await myFetch(url, fetchOptions)
  }

  let items: unknown[] = []
  if (itemsSelect) {
    items = selectJson(json, itemsSelect) as unknown[]
  } else {
    items = Array.isArray(json) ? json : []
  }

  if (!Array.isArray(items)) {
    // Fallback or just empty
    return []
  }

  const news: NewsItem[] = items.map((item, index) => {
    const context: JsonFieldContext = {
      vars: loaderContext.vars ?? {},
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
      const timestampValue = resolveValue(item, context, fields.timestamp)
      const timestamp = timestampValue === undefined || timestampValue === null || timestampValue === ""
        ? undefined
        : Number(timestampValue)
      if (timestamp !== undefined && Number.isFinite(timestamp)) newsItem.timestamp = timestamp
    }

    if (fields.inline) {
      const inline: Record<string, unknown> = {}
      for (const [key, field] of Object.entries(fields.inline)) {
        const val = resolveValue(item, context, field as JsonField, key === "html")
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
      for (const [key, field] of Object.entries(fields.preview)) {
        const val = resolveValue(item, context, field as JsonField, key === "html")
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
