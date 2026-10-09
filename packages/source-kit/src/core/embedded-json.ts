import type { EmbeddedJsonOptions } from "@newsnext/sdk/models"
import { load } from "cheerio/slim"

/** Parse one JSON document from HTML. Missing elements and invalid JSON fail explicitly. */
export function parseEmbeddedJson(html: string, options: EmbeddedJsonOptions): unknown {
  if (!options.select.trim()) throw new Error("Embedded JSON requires a CSS selector")
  const $ = load(html)
  const element = $(options.select).first()
  if (!element.length) throw new Error(`Embedded JSON element not found: ${options.select}`)
  const text = options.attr === undefined ? element.text() : element.attr(options.attr)
  if (!text?.trim()) throw new Error(`Embedded JSON content is empty: ${options.select}`)
  try {
    return JSON.parse(text) as unknown
  } catch (cause) {
    throw new Error(`Invalid embedded JSON: ${options.select}`, { cause })
  }
}
