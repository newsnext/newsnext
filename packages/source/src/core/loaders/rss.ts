import type {
  NewsItem,
  SourceLoaderResult,
} from "../../types"
import type { LoaderContext } from "./shared"
import { load } from "cheerio/slim"
import { decodeHTMLStrict } from "entities"
import { XMLParser } from "fast-xml-parser"
import { resolveSourceLoaderResultUrls } from "../base-url"
import { normalizeLoaderMetadata, requestLoaderResponse } from "./shared"

const JSON_FEED_VERSIONS = new Set([
  "https://jsonfeed.org/version/1",
  "https://jsonfeed.org/version/1.1",
])
const MAX_DERIVED_TITLE_LENGTH = 200

interface ParsedRssItem extends NewsItem {
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
  if (!data?.items.length) throw new Error("Cannot fetch RSS data")

  return resolveSourceLoaderResultUrls(data, response.url || url)
}

export function parseRss(data: string): SourceLoaderResult | undefined {
  try {
    return data.trimStart().startsWith("{")
      ? parseJsonFeed(data)
      : parseXmlFeed(data)
  } catch {
    return undefined
  }
}

function parseXmlFeed(data: string): SourceLoaderResult | undefined {
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
    .map(parseXmlFeedItem)
    .filter((item): item is ParsedRssItem => item !== undefined)

  return createParsedFeed(parsedItems, {
    badge: readXmlImageUrl(channel.image),
    desc: readXmlOptionalText(channel.description ?? channel.subtitle),
    home: readXmlFeedHome(channel.link),
    title: readXmlOptionalText(channel.title),
  })
}

function parseXmlFeedItem(item: Record<string, unknown>): ParsedRssItem | undefined {
  const title = readXmlText(item.title)
  const url = readXmlLink(item.link)
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

function parseJsonFeed(data: string): SourceLoaderResult | undefined {
  const feed: unknown = JSON.parse(data)
  if (!isRecord(feed)) return

  const title = readString(feed.title)
  if (
    !JSON_FEED_VERSIONS.has(readString(feed.version))
    || !title
    || !Array.isArray(feed.items)
  ) {
    return
  }

  const parsedItems = feed.items
    .filter(isRecord)
    .map(parseJsonFeedItem)
    .filter((item): item is ParsedRssItem => item !== undefined)

  return createParsedFeed(parsedItems, {
    badge: readString(feed.icon) || readString(feed.favicon),
    desc: readString(feed.description),
    home: readString(feed.home_page_url),
    title,
  })
}

function parseJsonFeedItem(item: Record<string, unknown>): ParsedRssItem | undefined {
  const title = readJsonFeedItemTitle(item)
  const url = readJsonFeedItemUrl(item)
  if (!title || !url) return

  const authorInput = Array.isArray(item.authors)
    ? item.authors.find(isRecord)
    : isRecord(item.author) ? item.author : undefined
  const authorName = authorInput ? readString(authorInput.name) : ""
  const authorAvatar = authorInput ? readString(authorInput.avatar) : ""

  return {
    title,
    url,
    publishedTimestamp: parseOptionalTimestamp(item.date_published),
    updatedTimestamp: parseOptionalTimestamp(item.date_modified),
    ...((authorName || authorAvatar)
      ? {
          inline: {
            ...(authorName ? { text: authorName } : {}),
            ...(authorAvatar ? { icon: authorAvatar } : {}),
          },
        }
      : {}),
  }
}

function readJsonFeedItemTitle(item: Record<string, unknown>): string {
  const title = readString(item.title)
  if (title) return title

  const text = readString(item.summary) || readString(item.content_text)
  if (text) return deriveTitle(text)

  const html = readString(item.content_html)
  return html ? deriveTitle(load(html).text()) : ""
}

function readJsonFeedItemUrl(item: Record<string, unknown>): string {
  const url = readString(item.url) || readString(item.external_url)
  if (url) return url

  const id = readString(item.id)
  if (!id) return ""
  try {
    const parsed = new URL(id)
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : ""
  } catch {
    return ""
  }
}

function deriveTitle(value: string): string {
  const title = value.replace(/\s+/g, " ").trim()
  return title.length > MAX_DERIVED_TITLE_LENGTH
    ? `${title.slice(0, MAX_DERIVED_TITLE_LENGTH - 1).trimEnd()}…`
    : title
}

function createParsedFeed(
  parsedItems: ParsedRssItem[],
  metadata: Record<string, unknown>,
): SourceLoaderResult {
  const timestampField = findOrderedTimestampField(parsedItems)
  return {
    items: parsedItems.map(({
      publishedTimestamp,
      updatedTimestamp,
      ...item
    }) => ({
      ...item,
      ...(timestampField
        ? {
            timestamp: timestampField === "publishedTimestamp"
              ? publishedTimestamp
              : updatedTimestamp,
          }
        : {}),
    })),
    metadata: normalizeLoaderMetadata(metadata),
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
  const text = readXmlOptionalText(value)
  if (!text) return

  const timestamp = new Date(text).getTime()
  return Number.isFinite(timestamp) ? timestamp : undefined
}

function readXmlImageUrl(value: unknown): string | undefined {
  const image = Array.isArray(value) ? value[0] : value
  if (!isRecord(image)) return
  return readXmlOptionalText(image.url)
}

function readXmlLink(value: unknown): string {
  if (typeof value === "string") return value
  if (!isRecord(value)) return ""
  return typeof value.href === "string" ? value.href : ""
}

function readXmlFeedHome(value: unknown): string | undefined {
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

function readXmlOptionalText(value: unknown): string | undefined {
  const text = readXmlText(value)
  return text || undefined
}

function readXmlText(value: unknown): string {
  if (typeof value === "string") return decodeHTMLStrict(value)
  if (!isRecord(value)) return ""
  return typeof value.$text === "string" ? decodeHTMLStrict(value.$text) : ""
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
