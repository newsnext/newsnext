import type { AnyNode } from "domhandler"
import type { FetchOptions } from "ofetch"
import type { NewsItem, Parameter } from "../typings/sources"
import { Buffer } from "node:buffer"
import * as cheerio from "cheerio"
import iconv from "iconv-lite"
import { myFetch } from "./fetch"
import { defineSourceGetterWithParams } from "./source"

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
    updated?: FieldSelector
    extra?: Record<string, FieldSelector>
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

export function defineHtmlSourceGetter(
  options: () => HtmlSourceOptions,
): { getter: () => Promise<NewsItem[]> }
export function defineHtmlSourceGetter<P extends Record<string, Parameter> = Record<string, Parameter>>(
  params: P,
  options: (params: { [K in keyof P]: P[K]["default"] }) => HtmlSourceOptions,
): { params: P, getter: (params: any) => Promise<NewsItem[]> }
export function defineHtmlSourceGetter(
  ...args: any[]
): any {
  const params = args.length === 2 ? args[0] : {}
  const options = args.length === 2 ? args[1] : args[0]

  return defineSourceGetterWithParams(params, async (paramsValue) => {
    const opts = options(paramsValue)
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

      if (fields.updated) {
        const updatedConfig = resolveFieldSelector(fields.updated)
        const updated = resolveField($, el, updatedConfig)
        if (updated) item.updated = updated
      }

      if (fields.extra) {
        item.extra = {}
        for (const [key, fieldSelector] of Object.entries(fields.extra)) {
          const config = resolveFieldSelector(fieldSelector as FieldSelector)
          const extraValue = resolveField($, el, config)
          if (extraValue !== undefined && extraValue !== "") {
            item.extra[key as keyof typeof item.extra] = extraValue
          }
        }
      }

      news.push(item)
    })

    if (news.length > 0 && news[0].updated) {
      news.sort((a, b) => (b.updated as number) - (a.updated as number))
    }

    return news
  })
}
