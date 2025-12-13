import type { FetchOptions } from "ofetch"
import type { NewsItem, Parameter } from "../typings/sources"
import { myFetch } from "./fetch"
import { defineSourceGetterWithParams } from "./source"

export type FieldResolver<Item = any, Result = any, P = any> = string | ((item: Item, params: P) => Result)

export interface JsonSourceOptions<Item = any, P extends Record<string, Parameter> = Record<string, Parameter>> {
  url: string | ((params: { [K in keyof P]: P[K]["default"] }) => string)
  /**
   * Path to the array of items in the response JSON (e.g. "data.items").
   * OR a function that returns the items array from the JSON.
   * OR a function that returns the path string (for dynamic paths).
   *
   * If not provided, assumes the response itself is the array.
   */
  items?: string | ((json: any, params: { [K in keyof P]: P[K]["default"] }) => Item[] | string)
  /**
   * Custom fetch function
   */
  fetchOptions?: FetchOptions | ((params: { [K in keyof P]: P[K]["default"] }) => FetchOptions)
  fetch?: (url: string, params: { [K in keyof P]: P[K]["default"] }) => Promise<any>
  fields: {
    title: FieldResolver<Item, string, { [K in keyof P]: P[K]["default"] }>
    url: FieldResolver<Item, string, { [K in keyof P]: P[K]["default"] }>
    updated?: FieldResolver<Item, number, { [K in keyof P]: P[K]["default"] }>
    extra?: Record<string, FieldResolver<Item, any, { [K in keyof P]: P[K]["default"] }>>
  }
  params?: P
}

export function resolvePath(item: any, path: string) {
  return path.split(".").reduce((acc: any, part) => acc && acc[part], item)
}

function resolveValue<Item, P>(item: Item, params: P, resolver: FieldResolver<Item, any, P>): any {
  if (typeof resolver === "function") {
    return resolver(item, params)
  }
  // Simple dot notation resolution
  return resolvePath(item, resolver as string)
}

export function defineJsonSourceGetter<Item = any, P extends Record<string, Parameter> = Record<string, Parameter>>(options: JsonSourceOptions<Item, P>) {
  const getter = async (params: any) => {
    const url = typeof options.url === "function" ? options.url(params) : options.url

    const fetchOpts = typeof options.fetchOptions === "function"
      ? options.fetchOptions(params)
      : options.fetchOptions

    let json: any
    if (options.fetch) {
      json = await options.fetch(url, params)
    } else {
      json = await myFetch(url, fetchOpts)
    }

    let items: Item[] = []
    if (options.items) {
      if (typeof options.items === "function") {
        const res = options.items(json, params)
        if (typeof res === "string") {
          items = resolvePath(json, res)
        } else {
          items = res
        }
      } else if (typeof options.items === "string") {
        items = resolvePath(json, options.items)
      }
    } else {
      items = Array.isArray(json) ? json : []
    }

    if (!Array.isArray(items)) {
      // Fallback or just empty
      return []
    }

    const news: NewsItem[] = items.map((item) => {
      const title = resolveValue(item, params, options.fields.title)
      const itemUrl = resolveValue(item, params, options.fields.url)

      if (!title || !itemUrl) return null

      const newsItem: NewsItem = {
        title,
        url: itemUrl,
      }

      if (options.fields.updated) {
        const updated = resolveValue(item, params, options.fields.updated)
        if (updated) newsItem.updated = updated
      }

      if (options.fields.extra) {
        newsItem.extra = {}
        for (const [key, resolver] of Object.entries(options.fields.extra)) {
          const val = resolveValue(item, params, resolver!)
          if (val !== undefined) {
            newsItem.extra[key as keyof typeof newsItem.extra] = val
          }
        }
      }
      return newsItem
    }).filter((i): i is NewsItem => i !== null)

    // Sort by updated if available
    if (news.length > 0 && news[0].updated) {
      news.sort((a, b) => (b.updated as number) - (a.updated as number))
    }

    return news
  }

  if (options.params) {
    return defineSourceGetterWithParams(options.params, getter)
  }

  return { getter }
}
