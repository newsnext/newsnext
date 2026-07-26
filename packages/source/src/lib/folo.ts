import type { NewsItem } from "@newsnext/source/typings"
import type { ProviderConfig } from "@newsnext/source/utils/source"
import { myFetch } from "@newsnext/source/utils/fetch"

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
  color: "orange",
  home: "https://folo.is",
  sources: {
    feed: {
      metadata: {
        title: "Feed",
        type: "timeline",
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
              feedId: "{{ path.feedId }}",
            },
            metadata: {
              title: "{{ page.title | normalize_whitespace | regex_replace: '\\\\s*[|–—-]\\\\s*Folo$', '' | default: 'Feed' }}",
              home: "https://app.folo.is/timeline/articles/feed-{{ params.feedId }}/pending",
            },
          },
          confidence: 0.98,
        },
      ],
      loader: {
        type: "custom",
        load: async ({ feedId }) => loadFoloEntries({ feedId }),
      },
      capabilities: {
        network: ["api.folo.is"],
      },
      cache: "5m",
    },
    list: {
      metadata: {
        title: "List",
        type: "timeline",
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
              listId: "{{ path.listId }}",
            },
            metadata: {
              title: "{{ page.title | normalize_whitespace | regex_replace: '\\\\s*[|–—-]\\\\s*Folo$', '' | default: 'List' }}",
              home: "https://app.folo.is/timeline/articles/list-{{ params.listId }}/pending",
            },
          },
          confidence: 0.98,
        },
      ],
      loader: {
        type: "custom",
        load: async ({ listId }) => loadFoloEntries({ listId }),
      },
      capabilities: {
        network: ["api.folo.is"],
      },
      cache: "5m",
    },
  },
} satisfies ProviderConfig
