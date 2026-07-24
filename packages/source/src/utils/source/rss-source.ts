import type { NewsItem } from "../../typings/sources"
import { rss2json } from "./rss2json"

export async function loadRss({ url }: { url: string }): Promise<NewsItem[]> {
  const data = await rss2json(url)
  if (!data?.items.length) throw new Error("Cannot fetch rss data")
  return data.items.map(item => ({
    title: item.title,
    url: item.link,
    timestamp: item.created ? new Date(item.created).getTime() : undefined,
  }))
}
