import type { NewsItem } from "../typings"
import { myFetch } from "../utils/fetch"
import { $textParam } from "../utils/params"
import { $provider, $source } from "../utils/source"

interface FoloMedia {
  url?: string
  type?: string
}

interface FoloEntry {
  title?: string
  url?: string
  description?: string | null
  author?: string | null
  publishedAt?: string | null
  insertedAt?: string | null
  media?: FoloMedia[] | null
  categories?: string[] | null
  summary?: string | null
}

interface FoloFeed {
  title?: string | null
  image?: string | null
  siteUrl?: string | null
}

interface FoloDataItem {
  entries?: FoloEntry
  feeds?: FoloFeed
}

interface FoloResponse {
  code?: number
  data?: FoloDataItem[]
}

type FoloEntriesRequest = { feedId: string } | { listId: string }

async function loadFoloEntries(body: FoloEntriesRequest): Promise<NewsItem[]> {
  const res = await myFetch<FoloResponse>("https://api.folo.is/entries", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-app-name": "Folo Web",
      "x-app-platform": "desktop/web",
      "x-app-version": "1.10.0",
    },
    body: {
      view: 0,
      ...body,
    },
  })

  return foloEntriesToNewsItems(res.data ?? [])
}

export function foloEntriesToNewsItems(items: FoloDataItem[]): NewsItem[] {
  const newsItems: NewsItem[] = []

  for (const { entries, feeds } of items) {
    if (!entries?.title || !entries.url) {
      continue
    }

    const item: NewsItem = {
      title: entries.title,
      url: entries.url,
    }
    const inline: NonNullable<NewsItem["inline"]> = {
      text: entries.author ?? feeds?.title ?? "",
    }

    const timestampSource = entries.publishedAt ?? entries.insertedAt
    const timestamp = timestampSource ? new Date(timestampSource).getTime() : undefined
    if (timestamp !== undefined && !Number.isNaN(timestamp)) {
      item.timestamp = timestamp
    }

    const previewText = entries.summary ?? entries.description ?? undefined
    const pictures = entries.media
      ?.filter((media): media is FoloMedia & { url: string } => media.type === "photo" && Boolean(media.url))
      .map(media => media.url)

    if (previewText || (pictures && pictures.length > 0)) {
      item.preview = {
        text: previewText ?? "",
      }

      if (pictures && pictures.length > 0) {
        item.preview.picture = pictures
      }
    }

    item.inline = inline
    newsItems.push(item)
  }

  return newsItems.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
}

export default $provider({
  title: "Folo",
  color: "orange",
  home: "https://folo.is",
  sources: [
    $source(
      {
        key: "feed",
        title: "Feed",
        type: "timeline",
        category: "others",
        params: {
          feedId: $textParam({
            title: "Feed ID",
            default: "71931642168770560",
          }),
        },
      },
      async ({ feedId }) => {
        return loadFoloEntries({ feedId })
      },
    ),
    $source(
      {
        key: "list",
        title: "List",
        type: "timeline",
        category: "others",
        params: {
          listId: $textParam({
            title: "List ID",
            default: "68649150114432000",
          }),
        },
      },
      async ({ listId }) => {
        return loadFoloEntries({ listId })
      },
    ),
  ],
})
