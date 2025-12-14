import type { FetchOptions } from "ofetch"
import type { NewsItem, Parameter } from "../typings/sources"
import { myFetch } from "./fetch"
import { defineSourceGetterWithParams } from "./source"

export type FieldResolver<Item = any, Result = any> = string | ((item: Item, params?: any) => Result)

export interface JsonSourceOptions<Item = any> {
  url: string
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
  fetch?: (url: string) => Promise<any>
  fields: {
    title: FieldResolver<Item, string>
    url: FieldResolver<Item, string>
    updated?: FieldResolver<Item, number>
    extra?: Record<string, FieldResolver<Item, any>>
  }
}

export function resolvePath(item: any, path: string) {
  return path.split(".").reduce((acc: any, part) => acc && acc[part], item)
}

function resolveValue<Item>(item: Item, resolver: FieldResolver<Item, any>): any {
  if (typeof resolver === "function") {
    return resolver(item, undefined)
  }
  // Simple dot notation resolution
  return resolvePath(item, resolver as string)
}

export function defineJsonSourceGetter<Item = any>(
  options: () => JsonSourceOptions<Item>,
): { getter: () => Promise<NewsItem[]> }
export function defineJsonSourceGetter<Item = any, P extends Record<string, Parameter> = Record<string, Parameter>>(
  params: P,
  options: (params: { [K in keyof P]: P[K]["default"] }) => JsonSourceOptions<Item>,
): { params: P, getter: (params: any) => Promise<NewsItem[]> }
export function defineJsonSourceGetter<Item = any>(
  ...args: any[]
): any {
  const params = args.length === 2 ? args[0] : {}
  const options = args.length === 2 ? args[1] : args[0]

  return defineSourceGetterWithParams(params, async (paramsValue) => {
    const opts = options(paramsValue)
    const { url, fetchOptions, fetch, items: itemsResolver, fields } = opts

    let json: any
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
          items = resolvePath(json, res)
        } else {
          items = res
        }
      } else if (typeof itemsResolver === "string") {
        items = resolvePath(json, itemsResolver)
      }
    } else {
      items = Array.isArray(json) ? json : []
    }

    if (!Array.isArray(items)) {
      // Fallback or just empty
      return []
    }

    const news: NewsItem[] = items.map((item) => {
      const title = resolveValue(item, fields.title)
      const itemUrl = resolveValue(item, fields.url)

      if (!title || !itemUrl) return null

      const newsItem: NewsItem = {
        title,
        url: itemUrl,
      }

      if (fields.updated) {
        const updated = resolveValue(item, fields.updated)
        if (updated) newsItem.updated = updated
      }

      if (fields.extra) {
        newsItem.extra = {}
        for (const [key, resolver] of Object.entries(fields.extra)) {
          const val = resolveValue(item, resolver as FieldResolver<Item, any>)
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
  })
}
