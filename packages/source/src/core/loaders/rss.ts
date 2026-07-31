import type { SourceLoaderMetadata, SourceLoaderResult } from "../../types"
import { XMLParser } from "fast-xml-parser"
import { sessionFetch } from "../../utils"
import { normalizeLoaderMetadata } from "./shared"

interface RssItem {
  created?: string
  link: string
  title: string
}

interface ParsedRssFeed {
  items: RssItem[]
  metadata?: SourceLoaderMetadata
}

export async function loadRss({ url }: { url: string }): Promise<SourceLoaderResult> {
  const data = parseRss(await sessionFetch(url, { responseType: "text" }))
  if (!data?.items.length) throw new Error("Cannot fetch rss data")

  return {
    items: data.items.map(item => ({
      title: item.title,
      url: item.link,
      timestamp: item.created ? new Date(item.created).getTime() : undefined,
    })),
    metadata: data.metadata,
  }
}

export function parseRss(data: string): ParsedRssFeed | undefined {
  const xml = new XMLParser({
    attributeNamePrefix: "",
    textNodeName: "$text",
    ignoreAttributes: false,
  })
  const result = xml.parse(data as string)
  let channel = result.rss?.channel ?? result.feed ?? result.source
  if (Array.isArray(channel)) channel = channel[0]
  if (!isRecord(channel)) return

  const itemInput = channel.item ?? channel.entry
  const items = (Array.isArray(itemInput) ? itemInput : itemInput ? [itemInput] : [])
    .filter(isRecord)

  return {
    items: items.map(item => ({
      title: readText(item.title),
      link: readLink(item.link),
      created: readOptionalText(item.updated ?? item.pubDate ?? item.created),
    })),
    metadata: normalizeLoaderMetadata({
      badge: readRssImageUrl(channel.image),
      desc: readOptionalText(channel.description ?? channel.subtitle),
      title: readOptionalText(channel.title),
    }),
  }
}

function readRssImageUrl(value: unknown): string | undefined {
  const image = Array.isArray(value) ? value[0] : value
  if (!isRecord(image)) return
  return readOptionalText(image.url)
}

function readLink(value: unknown): string {
  if (typeof value === "string") return value
  if (!isRecord(value)) return ""
  return typeof value.href === "string" ? value.href : ""
}

function readOptionalText(value: unknown): string | undefined {
  const text = readText(value)
  return text || undefined
}

function readText(value: unknown): string {
  if (typeof value === "string") return value
  if (!isRecord(value)) return ""
  return typeof value.$text === "string" ? value.$text : ""
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
