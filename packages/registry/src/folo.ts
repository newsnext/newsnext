import type { ProviderConfig } from "@newsnext/source/registry"
import type { NewsItem } from "@newsnext/source/types"
import { myFetch } from "@newsnext/source/utils"

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
  summary?: string | null
}

interface FoloDataItem {
  entries?: FoloEntry
  feeds?: {
    title?: string | null
  }
}

interface FoloResponse {
  data?: FoloDataItem[]
}

type FoloEntriesRequest = { feedId: string } | { listId: string }

async function loadFoloEntries(body: FoloEntriesRequest): Promise<NewsItem[]> {
  const response = await myFetch<FoloResponse>("https://api.folo.is/entries", {
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

  return (response.data ?? [])
    .flatMap(({ entries, feeds }): NewsItem[] => {
      if (!entries?.title || !entries.url) return []

      const timestampSource = entries.publishedAt ?? entries.insertedAt
      const timestamp = timestampSource ? Date.parse(timestampSource) : Number.NaN
      const pictures = entries.media
        ?.filter((media): media is FoloMedia & { url: string } => media.type === "photo" && Boolean(media.url))
        .map(media => media.url)
      const previewText = entries.summary ?? entries.description ?? undefined
      const item: NewsItem = {
        title: entries.title,
        url: entries.url,
        inline: {
          text: entries.author ?? feeds?.title ?? "",
        },
      }

      if (!Number.isNaN(timestamp)) item.timestamp = timestamp
      if (previewText || pictures?.length) {
        item.preview = {
          text: previewText ?? "",
          ...(pictures?.length ? { picture: pictures } : {}),
        }
      }

      return [item]
    })
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
}

export default {
  title: "Folo",
  category: "news",
  icon: "https://icons.folo.is/folo.is",
  color: "orange",
  defaults: {
    cache: "5m",
    loader: {
      type: "custom",
    },
    capabilities: {
      network: ["api.folo.is"],
    },
    metadata: {
      home: "https://folo.is",
      type: "timeline",
    },
  },
  sources: {
    feed: {
      metadata: {
        title: "Feed",
      },
      params: {
        feedId: {
          type: "text",
          title: "Feed ID",
          default: "71931642168770560",
          pattern: "^\\d+$",
        },
      },
      radar: [
        {
          id: "folo-feed",
          match: {
            hosts: ["app.folo.is"],
            paths: ["/timeline/articles/feed-:feedId/pending"],
          },
          patch: {
            params: {
              feedId: "{{ scope.path.feedId }}",
            },
            metadata: {
              home: "https://app.folo.is/timeline/articles/feed-{{ scope.params.feedId }}/pending",
            },
          },
          confidence: 0.98,
        },
      ],
      loader: {
        load: async ({ feedId }) => loadFoloEntries({ feedId }),
      },
    },
    list: {
      metadata: {
        title: "List",
      },
      params: {
        listId: {
          type: "text",
          title: "List ID",
          default: "68649150114432000",
          pattern: "^\\d+$",
        },
      },
      radar: [
        {
          id: "folo-list",
          match: {
            hosts: ["app.folo.is"],
            paths: ["/timeline/articles/list-:listId/pending"],
          },
          patch: {
            params: {
              listId: "{{ scope.path.listId }}",
            },
            metadata: {
              home: "https://app.folo.is/timeline/articles/list-{{ scope.params.listId }}/pending",
            },
          },
          confidence: 0.98,
        },
      ],
      loader: {
        load: async ({ listId }) => loadFoloEntries({ listId }),
      },
    },
  },
} satisfies ProviderConfig
