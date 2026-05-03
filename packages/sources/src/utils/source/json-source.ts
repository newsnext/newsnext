import type { FetchOptions } from "ofetch"
import type { InferSourceParams, NewsItem, SourceParamSchemaMap } from "../../typings/sources"
import { createLoader } from "."
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
    meta?: {
      text?: FieldResolver<Item, string>
      html?: FieldResolver<Item, string>
      mark?: FieldResolver<Item, NonNullable<NewsItem["meta"]>["mark"]>
      icon?: FieldResolver<Item, NonNullable<NewsItem["meta"]>["icon"]>
    }
    detail?: {
      text?: FieldResolver<Item, string>
      html?: FieldResolver<Item, string>
      picture?: FieldResolver<Item, NonNullable<NewsItem["detail"]>["picture"]>
      iframe?: FieldResolver<Item, NonNullable<NewsItem["detail"]>["iframe"]>
    }
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

    if (fields.meta) {
      const meta: any = {}
      for (const [key, resolver] of Object.entries(fields.meta)) {
        const val = resolveValue(item, resolver as FieldResolver<Item, any>)
        if (val !== undefined) {
          meta[key as keyof typeof meta] = val
        }
      }
      newsItem.meta = meta
    }

    if (fields.detail) {
      const detail: any = {}
      for (const [key, resolver] of Object.entries(fields.detail)) {
        const val = resolveValue(item, resolver as FieldResolver<Item, any>)
        if (val !== undefined) {
          detail[key as keyof typeof detail] = val
        }
      }
      newsItem.detail = detail
    }

    return newsItem
  }).filter((i): i is NewsItem => i !== null)

  // Sort by timestamp if available
  if (news.length > 0 && news[0].timestamp) {
    news.sort((a, b) => (b.timestamp as number) - (a.timestamp as number))
  }

  return news
}

export function $jsonLoader<Item = any>(
  options: () => JsonSourceOptions<Item>,
): { loader: () => Promise<NewsItem[]> }
export function $jsonLoader<P extends SourceParamSchemaMap, Item = any>(
  params: P,
  options: (params: InferSourceParams<P>) => JsonSourceOptions<Item>,
): { params: P, loader: (params: InferSourceParams<P>) => Promise<NewsItem[]> }
export function $jsonLoader<Item = any>(
  ...args: any[]
): any {
  return (createLoader<JsonSourceOptions<Item>>(jsonSourceHandler as any) as any)(...args)
}
