import type { ProviderConfig } from "@newsnext/source-kit/registry"
import type { NewsItemInput, SourceLoaderContext, SourceLoaderOutput } from "@newsnext/source-kit/types"

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
    id?: string
    image?: string | null
    title?: string | null
  }
}

interface FoloResponse {
  data?: FoloDataItem[]
}

type FoloEntriesRequest = { feedId: string } | { listId: string }

async function loadFoloEntries(
  payload: FoloEntriesRequest,
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  const isList = "listId" in payload
  const response = await context.fetch.post("https://api.folo.is/entries", {
    headers: {
      "x-app-name": "Folo Web",
      "x-app-platform": "desktop/web",
      "x-app-version": "1.10.0",
    },
    json: {
      view: 0,
      ...payload,
    },
  }).json<FoloResponse>()

  const badge = !isList
    ? response.data?.find(({ feeds }) => feeds?.id === payload.feedId)?.feeds?.image
    : undefined

  return {
    metadata: badge ? { badge } : undefined,
    items: (response.data ?? [])
      .flatMap(({ entries, feeds }): NewsItemInput[] => {
        if (!entries?.title || !entries.url) return []

        const timestampSource = entries.publishedAt ?? entries.insertedAt
        const timestamp = timestampSource ? Date.parse(timestampSource) : Number.NaN
        const pictures = entries.media
          ?.filter((media): media is FoloMedia & { url: string } => media.type === "photo" && Boolean(media.url))
          .map(media => media.url)
        const previewText = entries.summary ?? entries.description ?? undefined
        return [{
          title: entries.title,
          url: entries.url,
          publishedAt: timestamp,
          author: { name: entries.author },
          attributes: { source: feeds?.title },
          icon: isList && feeds?.image
            ? {
                src: feeds.image,
                kind: "source",
                label: feeds.title ?? undefined,
              }
            : undefined,
          content: {
            text: previewText,
            pictures,
          },
        }]
      })
      .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0)),
  }
}

const FOLO_INLINE_TEMPLATE = "{% if scope.item.author %}{{ scope.item.author.name }}{% else %}{{ scope.item.attributes.source }}{% endif %}"

export default {
  title: "Folo",
  category: "news",
  color: "orange",
  defaults: {
    baseUrl: "https://folo.is/",
    loader: {
      type: "custom",
    },
    capabilities: {
      network: ["api.folo.is"],
    },
    metadata: {
      home: "/",
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
          required: true,
          validate: { format: "digits" },
        },
      },
      radar: [
        {
          id: "folo-feed",
          match: {
            hosts: ["app.folo.is"],
            paths: ["/timeline/articles/:feedId/*rest"],
          },
          patch: {
            params: {
              feedId: "{{ scope.path.feedId }}",
            },
            metadata: {
              title: "{{ scope.page.title | replace: ' | Folo', '' }}",
              home: "https://app.folo.is/timeline/articles/{{ scope.params.feedId }}/pending",
            },
          },
        },
      ],
      loader: {
        load: loadFoloEntries,
        inlineTemplate: FOLO_INLINE_TEMPLATE,
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
          required: true,
          validate: { format: "digits" },
        },
      },
      radar: [
        {
          id: "folo-list",
          match: {
            hosts: ["app.folo.is"],
            paths: ["/timeline/articles/list-:listId/*rest"],
          },
          patch: {
            params: {
              listId: "{{ scope.path.listId }}",
            },
            metadata: {
              title: "{{ scope.page.title | replace: ' | Folo', '' }}",
              home: "https://app.folo.is/timeline/articles/list-{{ scope.params.listId }}/pending",
            },
          },
        },
      ],
      loader: {
        load: loadFoloEntries,
        inlineTemplate: FOLO_INLINE_TEMPLATE,
      },
    },
  },
} satisfies ProviderConfig
