import type {
  NewsItem,
  SourceLoaderResult,
  SourcePresentationMetadata,
} from "../../types"
import type { LoaderContext } from "./shared"
import { XMLParser } from "fast-xml-parser"
import { normalizeLoaderMetadata, requestLoaderResponse } from "./shared"

interface ParsedRssFeed {
  items: NewsItem[]
  metadata?: SourcePresentationMetadata
}

interface ParsedRssItem {
  title: string
  url: string
  publishedTimestamp?: number
  updatedTimestamp?: number
}

type RssTimestampField = "publishedTimestamp" | "updatedTimestamp"

export async function loadRss(
  { url }: { url: string },
  loaderContext: LoaderContext = {},
): Promise<SourceLoaderResult> {
  const response = await requestLoaderResponse({ url }, loaderContext)
  const data = parseRss(await response.text())
  if (!data?.items.length) throw new Error("Cannot fetch rss data")

  return data
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
  const parsedItems = (Array.isArray(itemInput) ? itemInput : itemInput ? [itemInput] : [])
    .filter(isRecord)
    .map(parseRssItem)
    .filter((item): item is ParsedRssItem => item !== undefined)
  const timestampField = findOrderedTimestampField(parsedItems)

  return {
    items: parsedItems.map(item => ({
      title: item.title,
      url: item.url,
      ...(timestampField ? { timestamp: item[timestampField] } : {}),
    })),
    metadata: normalizeLoaderMetadata({
      badge: readRssImageUrl(channel.image),
      desc: readOptionalText(channel.description ?? channel.subtitle),
      home: readFeedHome(channel.link),
      title: readOptionalText(channel.title),
    }),
  }
}

function parseRssItem(item: Record<string, unknown>): ParsedRssItem | undefined {
  const title = readText(item.title)
  const url = readLink(item.link)
  if (!title || !url) return

  return {
    title,
    url,
    publishedTimestamp: parseOptionalTimestamp(
      item.published ?? item.pubDate ?? item.created,
    ),
    updatedTimestamp: parseOptionalTimestamp(item.updated),
  }
}

function findOrderedTimestampField(items: ParsedRssItem[]): RssTimestampField | undefined {
  const fields: RssTimestampField[] = ["publishedTimestamp", "updatedTimestamp"]
  return fields.find(field => hasDescendingTimestamps(items, field))
}

function hasDescendingTimestamps(
  items: ParsedRssItem[],
  field: RssTimestampField,
): boolean {
  let previousTimestamp = Number.POSITIVE_INFINITY
  for (const item of items) {
    const timestamp = item[field]
    if (timestamp === undefined || timestamp > previousTimestamp) return false
    previousTimestamp = timestamp
  }
  return items.length > 0
}

function parseOptionalTimestamp(value: unknown): number | undefined {
  const text = readOptionalText(value)
  if (!text) return

  const timestamp = new Date(text).getTime()
  return Number.isFinite(timestamp) ? timestamp : undefined
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

function readFeedHome(value: unknown): string | undefined {
  const links = Array.isArray(value) ? value : [value]
  for (const link of links) {
    if (typeof link === "string" && link) {
      return link
    }
    if (
      isRecord(link)
      && link.rel !== "self"
      && typeof link.href === "string"
      && link.href
    ) {
      return link.href
    }
  }
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
