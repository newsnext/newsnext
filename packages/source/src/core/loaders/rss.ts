import type {
  NewsItem,
  SourceLoaderResult,
  SourcePresentationMetadata,
} from "../../types"
import { XMLParser } from "fast-xml-parser"
import { sessionFetch } from "../../utils"
import { normalizeLoaderMetadata } from "./shared"

interface ParsedRssFeed {
  items: NewsItem[]
  metadata?: SourcePresentationMetadata
}

export async function loadRss({ url }: { url: string }): Promise<SourceLoaderResult> {
  const data = parseRss(await sessionFetch(url, { responseType: "text" }))
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
  const items = (Array.isArray(itemInput) ? itemInput : itemInput ? [itemInput] : [])
    .filter(isRecord)

  return {
    items: items
      .map((item) => {
        const title = readText(item.title)
        const url = readLink(item.link)
        if (!title || !url) return undefined

        const timestamp = parseOptionalTimestamp(item.updated ?? item.pubDate ?? item.created)
        return {
          title,
          url,
          ...(timestamp === undefined ? {} : { timestamp }),
        }
      })
      .filter((item): item is NewsItem => item !== undefined),
    metadata: normalizeLoaderMetadata({
      badge: readRssImageUrl(channel.image),
      desc: readOptionalText(channel.description ?? channel.subtitle),
      home: readFeedHome(channel.link),
      title: readOptionalText(channel.title),
    }),
  }
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
