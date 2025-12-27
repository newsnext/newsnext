import type { AnyNode } from "domhandler"
import type { FetchOptions } from "ofetch"
import type { NewsItem } from "../../typings/sources"
import { Buffer } from "node:buffer"
import * as cheerio from "cheerio"
import iconv from "iconv-lite"
import { createSourceFetcher } from "."
import { myFetch } from "../fetch"

export type FieldSelector = string | {
  selector?: string
  attr?: string
  transform?: (value: string | undefined, el: cheerio.Cheerio<AnyNode>) => any
}

export interface HtmlSourceOptions {
  url: string
  itemSelector: string
  // Allow dynamic decoding
  decoding?: string
  fetchOptions?: FetchOptions
  fetch?: (url: string) => Promise<string>
  fields: {
    title: FieldSelector
    url: FieldSelector
    mobileUrl?: FieldSelector
    timestamp?: FieldSelector
    info?: Record<string, FieldSelector>
    detail?: Record<string, FieldSelector>
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
  _defaultSelector?: string,
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

export const defineHtmlSourceFetcher = createSourceFetcher<HtmlSourceOptions>(async (opts) => {
  const { url, itemSelector, decoding, fetchOptions, fetch, fields } = opts

  let html: string
  if (fetch) {
    html = await fetch(url)
  } else if (decoding && decoding.toLowerCase() !== "utf-8") {
    const response = await myFetch(url, { ...fetchOptions, responseType: "arrayBuffer" }) as ArrayBuffer
    html = iconv.decode(Buffer.from(response), decoding)
  } else {
    const res = await myFetch(url, fetchOptions)
    html = typeof res === "string" ? res : JSON.stringify(res)
  }

  // console.log(html)
  const $ = cheerio.load(html)
  const $items = $(itemSelector)
  const news: NewsItem[] = []

  $items.each((_, el) => {
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

    if (fields.info) {
      item.info = {}
      for (const [key, fieldSelector] of Object.entries(fields.info)) {
        const config = resolveFieldSelector(fieldSelector as FieldSelector)
        const infoValue = resolveField($, el, config)
        if (infoValue !== undefined && infoValue !== "") {
          item.info[key as keyof typeof item.info] = infoValue
        }
      }
    }

    if (fields.detail) {
      item.detail = {}
      for (const [key, fieldSelector] of Object.entries(fields.detail)) {
        const config = resolveFieldSelector(fieldSelector as FieldSelector)
        const detailValue = resolveField($, el, config)
        if (detailValue !== undefined && detailValue !== "") {
          item.detail[key as keyof typeof item.detail] = detailValue
        }
      }
    }

    news.push(item)
  })

  if (news.length > 0 && news[0].timestamp) {
    news.sort((a, b) => (b.timestamp as number) - (a.timestamp as number))
  }

  return news
})
