import type { FetchOptions } from "ofetch"
import type { NewsItem, Parameter } from "../../typings/sources"
import { createSourceFetcher } from "."
import { myFetch } from "../fetch"

export type FieldResolver<Item = any, Result = any> = string | ((item: Item) => Result)

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
    mobileUrl?: FieldResolver<Item, string>
    timestamp?: FieldResolver<Item, number>
    info?: Record<string, FieldResolver<Item, any>>
    detail?: Record<string, FieldResolver<Item, any>>
  }
}

export function resolvePath(item: any, path: string) {
  return path.split(".").reduce((acc: any, part) => acc && acc[part], item)
}

function resolveValue<Item>(item: Item, resolver: FieldResolver<Item, any>): any {
  if (typeof resolver === "function") {
    return resolver(item)
  }
  // Simple dot notation resolution
  return resolvePath(item, resolver as string)
}

async function jsonSourceHandler<Item = any>(opts: JsonSourceOptions<Item>): Promise<NewsItem[]> {
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

    if (fields.mobileUrl) {
      const mobileUrl = resolveValue(item, fields.mobileUrl)
      if (mobileUrl) newsItem.mobileUrl = mobileUrl
    }

    if (fields.timestamp) {
      const timestamp = resolveValue(item, fields.timestamp)
      if (timestamp) newsItem.timestamp = timestamp
    }

    if (fields.info) {
      newsItem.info = {}
      for (const [key, resolver] of Object.entries(fields.info)) {
        const val = resolveValue(item, resolver as FieldResolver<Item, any>)
        if (val !== undefined) {
          newsItem.info[key as keyof typeof newsItem.info] = val
        }
      }
    }

    if (fields.detail) {
      newsItem.detail = {}
      for (const [key, resolver] of Object.entries(fields.detail)) {
        const val = resolveValue(item, resolver as FieldResolver<Item, any>)
        if (val !== undefined) {
          newsItem.detail[key as keyof typeof newsItem.detail] = val
        }
      }
    }

    return newsItem
  }).filter((i): i is NewsItem => i !== null)

  // Sort by timestamp if available
  if (news.length > 0 && news[0].timestamp) {
    news.sort((a, b) => (b.timestamp as number) - (a.timestamp as number))
  }

  return news
}

export function defineJsonSourceFetcher<Item = any>(
  options: () => JsonSourceOptions<Item>,
): { fetcher: () => Promise<NewsItem[]> }
export function defineJsonSourceFetcher<P extends Record<string, Parameter> = Record<string, Parameter>, Item = any>(
  params: P,
  options: (params: { [K in keyof P]: P[K]["default"] }) => JsonSourceOptions<Item>,
): { params: P, fetcher: (params: any) => Promise<NewsItem[]> }
export function defineJsonSourceFetcher<Item = any>(
  ...args: any[]
): any {
  return (createSourceFetcher<JsonSourceOptions<Item>>(jsonSourceHandler as any) as any)(...args)
}
