import type { NewsItem } from "@/typings/sources"
import { myFetch } from "../utils/fetch"
import { $provider, $source } from "../utils/source"
import { rss2json } from "../utils/source/rss2json"

interface AIHotItem {
  id: string
  title: string
  url: string
  source: string
  publishedAt?: string | null
  summary?: string | null
  category?: string | null
}

interface AIHotResponse {
  items?: AIHotItem[]
}

const AIHOT_API_URL = "https://aihot.virxact.com/api/public/items?mode=all&take=30"
const AIHOT_FEED_URL = "https://aihot.virxact.com/feed/all.xml"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 aihot-skill/0.2.0 newsnow/0.0.40"

async function loadRSSFallback(): Promise<NewsItem[]> {
  const data = await rss2json(AIHOT_FEED_URL)
  if (!data) return []

  return data.items.map(item => ({
    title: item.title,
    url: item.link,
    timestamp: item.created ? new Date(item.created).getTime() : undefined,
  }))
}

export default $provider({
  title: "AIHot",
  color: "blue",
  home: "https://aihot.virxact.com",
  category: "tech",
  sources: [
    $source(
      {
        key: "default",
        type: "timeline",
      },
      async () => {
        try {
          const response = await myFetch<AIHotResponse>(AIHOT_API_URL, {
            headers: {
              "User-Agent": USER_AGENT,
            },
          })

          const items = response.items?.filter(item => item.id && item.title && item.url) ?? []
          if (!items.length) return loadRSSFallback()

          return items.map<NewsItem>(item => ({
            title: item.title,
            url: item.url,
            timestamp: item.publishedAt ? new Date(item.publishedAt).getTime() : undefined,
            inline: {
              text: item.category ? `${item.source} · ${item.category}` : item.source,
            },
            preview: item.summary
              ? {
                  text: item.summary,
                }
              : undefined,
          }))
        } catch {
          return loadRSSFallback()
        }
      },
    ),
  ],
})
