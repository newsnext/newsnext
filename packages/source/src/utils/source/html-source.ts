import type * as cheerio from "cheerio/slim"
import type { AnyNode } from "domhandler"
import type { FetchOptions } from "ofetch"
import type {
  NewsItem,
  SourceRegistration,
} from "../../typings/sources"
import { load } from "cheerio/slim"
import { myFetch } from "../fetch"

export type FieldSelector<T = any> = string | {
  selector?: string
  attr?: string
  transform?: (value: string | undefined, el: cheerio.Cheerio<AnyNode>) => T | undefined
}

export type ItemsResolver = string | (($: cheerio.CheerioAPI) => cheerio.Cheerio<AnyNode> | AnyNode[])
export type ItemFilter = string | ((el: cheerio.Cheerio<AnyNode>, index: number, $: cheerio.CheerioAPI) => boolean)

export interface HtmlSourceOptions {
  url: string
  type?: SourceRegistration["type"]
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

function resolveFieldSelector(
  selectorConfig: FieldSelector,
): { selector?: string, attr?: string, transform?: any } {
  if (typeof selectorConfig === "object") {
    return selectorConfig
  }
  return { selector: selectorConfig }
}

function resolveField(
  $: cheerio.CheerioAPI,
  el: AnyNode,
  selectorConfig: string | { selector?: string, attr?: string, transform?: any },
): any {
  if (typeof selectorConfig === "string") {
    // Check if selector is empty string, if so, return undefined or maybe text of current el?
    if (!selectorConfig) return $(el).text().trim()
    return $(el).find(selectorConfig).text().trim()
  }

  const { selector, attr, transform } = selectorConfig
  const target = selector ? $(el).find(selector) : $(el)

  let value: string | undefined
  if (attr) {
    value = target.attr(attr)
  } else if (!selector && !attr) {
    value = target.text().trim()
  } else {
    value = target.text().trim()
  }

  if (transform) {
    return transform(value, target)
  }

  return value
}

export async function loadHtml(opts: HtmlSourceOptions): Promise<NewsItem[]> {
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
  const items = resolveItems($, itemsResolver)
  const news: NewsItem[] = []

  items.forEach((el, index) => {
    const $item = $(el)
    if (filter && !matchesFilter($item, index, $, filter)) return

    const titleConfig = resolveFieldSelector(fields.title)
    const urlConfig = resolveFieldSelector(fields.url)

    const title = resolveField($, el, titleConfig)
    // Allow URL to be derived from current page URL if urlConfig is empty/special
    let itemUrl = resolveField($, el, urlConfig)

    // Fallback: if no URL selector provided, use the page URL (common for single-item parsers)
    if (!urlConfig || (typeof urlConfig === "string" && !urlConfig) || (!urlConfig.selector && !urlConfig.attr)) {
      if (!itemUrl) itemUrl = url
    }

    if (!title || !itemUrl) return

    const item: NewsItem = {
      title,
      url: itemUrl,
    }

    if (fields.mobileUrl) {
      const mobileUrlConfig = resolveFieldSelector(fields.mobileUrl)
      const mobileUrl = resolveField($, el, mobileUrlConfig)
      if (mobileUrl) item.mobileUrl = mobileUrl
    }

    if (fields.timestamp) {
      const timestampConfig = resolveFieldSelector(fields.timestamp)
      const timestamp = resolveField($, el, timestampConfig)
      if (timestamp) item.timestamp = timestamp
    }

    if (fields.inline) {
      const inline: any = {}
      for (const [key, fieldSelector] of Object.entries(fields.inline)) {
        const config = resolveFieldSelector(fieldSelector as FieldSelector)
        const infoValue = resolveField($, el, config)
        if (infoValue !== undefined && infoValue !== "") {
          inline[key] = infoValue
        }
      }
      item.inline = inline
    }

    if (fields.preview) {
      const preview: any = {}
      for (const [key, fieldSelector] of Object.entries(fields.preview)) {
        const config = resolveFieldSelector(fieldSelector as FieldSelector)
        const detailValue = resolveField($, el, config)
        if (detailValue !== undefined && detailValue !== "") {
          preview[key] = detailValue
        }
      }
      item.preview = preview
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
  el: cheerio.Cheerio<AnyNode>,
  index: number,
  $: cheerio.CheerioAPI,
  filter: ItemFilter,
): boolean {
  if (typeof filter === "function") {
    return filter(el, index, $)
  }

  return el.is(filter)
}
