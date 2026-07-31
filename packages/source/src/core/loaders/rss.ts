import type { NewsItem } from "../../types"
import { XMLParser } from "fast-xml-parser"
import { sessionFetch } from "../../utils"

const HTTP_URL_REGEX = /^https?:\/\/[^\s$.?#].\S*/i

interface RssItem {
  created?: string
  link: string
  title: string
}

interface RssFeed {
  items: RssItem[]
}

export async function loadRss({ url }: { url: string }): Promise<NewsItem[]> {
  const data = await fetchRss(url)
  if (!data?.items.length) throw new Error("Cannot fetch rss data")
  return data.items.map(item => ({
    title: item.title,
    url: item.link,
    timestamp: item.created ? new Date(item.created).getTime() : undefined,
  }))
}

async function fetchRss(url: string): Promise<RssFeed | undefined> {
  if (!HTTP_URL_REGEX.test(url)) return

  const data = await sessionFetch(url)
  const xml = new XMLParser({
    attributeNamePrefix: "",
    textNodeName: "$text",
    ignoreAttributes: false,
  })
  const result = xml.parse(data as string)
  let channel = result.rss?.channel ?? result.feed ?? result.source
  if (Array.isArray(channel)) channel = channel[0]

  let items = channel.item || channel.entry || []
  if (items && !Array.isArray(items)) items = [items]

  return {
    items: items.map((item: Record<string, unknown>) => ({
      title: readText(item.title),
      link: readLink(item.link),
      created: readOptionalText(item.updated ?? item.pubDate ?? item.created),
    })),
  }
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
