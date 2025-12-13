import type { AnyNode } from "domhandler"
import type { FetchOptions } from "ofetch"
import type { NewsItem, Parameter } from "../typings/sources"
import { Buffer } from "node:buffer"
import * as cheerio from "cheerio"
import iconv from "iconv-lite"
import { myFetch } from "./fetch"
import { defineSourceGetterWithParams } from "./source"

export type FieldSelector<P = any> = string | {
  selector?: string | ((params: P) => string)
  attr?: string
  transform?: (value: string | undefined, el: cheerio.Cheerio<AnyNode>) => any
} | ((params: P) => string)

export interface HtmlSourceOptions<P extends Record<string, Parameter> = Record<string, Parameter>> {
  url: string | ((params: { [K in keyof P]: P[K]["default"] }) => string)
  itemSelector: string | ((params: { [K in keyof P]: P[K]["default"] }) => string)
  // Allow dynamic decoding
  decoding?: string | ((params: { [K in keyof P]: P[K]["default"] }) => string)
  fetchOptions?: FetchOptions | ((params: { [K in keyof P]: P[K]["default"] }) => FetchOptions)
  fetch?: (url: string, params: { [K in keyof P]: P[K]["default"] }) => Promise<string>
  fields: {
    title: FieldSelector<{ [K in keyof P]: P[K]["default"] }>
    url: FieldSelector<{ [K in keyof P]: P[K]["default"] }>
    updated?: FieldSelector<{ [K in keyof P]: P[K]["default"] }>
    extra?: Record<string, FieldSelector<{ [K in keyof P]: P[K]["default"] }>>
  }
  params?: P
}

function resolveFieldSelector<P>(
  selectorConfig: FieldSelector<P>,
  params: P,
): string | { selector?: string, attr?: string, transform?: any } {
  if (typeof selectorConfig === "function") {
    return selectorConfig(params)
  }
  if (typeof selectorConfig === "object" && typeof selectorConfig.selector === "function") {
    return {
      ...selectorConfig,
      selector: selectorConfig.selector(params),
    }
  }
  return selectorConfig as string | { selector?: string, attr?: string, transform?: any }
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

export function defineHtmlSourceGetter<P extends Record<string, Parameter>>(options: HtmlSourceOptions<P>) {
  const getter = async (params: any) => {
    const url = typeof options.url === "function" ? options.url(params) : options.url
    const itemSelector = typeof options.itemSelector === "function" ? options.itemSelector(params) : options.itemSelector
    const decoding = typeof options.decoding === "function" ? options.decoding(params) : options.decoding

    const fetchOpts = typeof options.fetchOptions === "function"
      ? options.fetchOptions(params)
      : options.fetchOptions

    let html: string
    if (options.fetch) {
      html = await options.fetch(url, params)
    } else if (decoding && decoding.toLowerCase() !== "utf-8") {
      const response = await myFetch(url, { ...fetchOpts, responseType: "arrayBuffer" }) as ArrayBuffer
      html = iconv.decode(Buffer.from(response), decoding)
    } else {
      const res = await myFetch(url, fetchOpts)
      html = typeof res === "string" ? res : JSON.stringify(res)
    }

    // console.log(html)
    const $ = cheerio.load(html)
    const $items = $(itemSelector)
    const news: NewsItem[] = []

    $items.each((_, el) => {
      const titleConfig = resolveFieldSelector(options.fields.title, params)
      const urlConfig = resolveFieldSelector(options.fields.url, params)

      const title = resolveField($, el, titleConfig)
      // Allow URL to be derived from current page URL if urlConfig is empty/special
      let itemUrl = resolveField($, el, urlConfig)

      // Fallback: if no URL selector provided, use the page URL (common for single-item parsers)
      if (!urlConfig || (typeof urlConfig === "string" && !urlConfig)) {
        itemUrl = url
      }

      if (!title || !itemUrl) return

      const item: NewsItem = {
        title,
        url: itemUrl,
      }

      if (options.fields.updated) {
        const updatedConfig = resolveFieldSelector(options.fields.updated, params)
        const updated = resolveField($, el, updatedConfig)
        if (updated) item.updated = updated
      }

      if (options.fields.extra) {
        item.extra = {}
        for (const [key, fieldSelector] of Object.entries(options.fields.extra)) {
          const config = resolveFieldSelector(fieldSelector, params)
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
  }

  if (options.params) {
    return defineSourceGetterWithParams(options.params, getter)
  }

  return { getter }
}
