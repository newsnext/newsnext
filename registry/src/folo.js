import { fieldTransforms } from "@newsnext/sdk/source"

async function loadFoloEntries(payload, context) {
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
  }).json()
  const badge = !isList
    ? response.data?.find(({ feeds }) => feeds?.id === payload.feedId)?.feeds?.image
    : undefined
  return {
    metadata: badge ? { badge } : undefined,
    items: (response.data ?? [])
      .flatMap(({ entries, feeds }) => {
        if (!entries?.title || !entries.url)
          return []
        const pictures = entries.media
          ?.filter(media => media.type === "photo" && Boolean(media.url))
          .map(media => media.url)
        const previewText = entries.summary ?? entries.description ?? undefined
        return [{
          title: entries.title,
          url: entries.url,
          publishedAt: fieldTransforms.date_to_ms(entries.publishedAt ?? entries.insertedAt),
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
const FOLO_ANNOTATION_TEMPLATE = "{{ scope.item.author.name ?? scope.item.attributes.source }}"
/** @type {import("@newsnext/sdk/source/registry").ProviderConfig} */
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
            paths: ["/timeline/articles/:feedId/*rest", "/timeline/all/:feedId/*rest"],
          },
          patch: {
            params: {
              feedId: "{{ scope.path.feedId }}",
            },
            metadata: {
              title: {
                select: "title",
                transform: { op: "replace", search: " | Folo", replacement: "" },
              },
              home: "https://app.folo.is/timeline/all/{{ scope.params.feedId }}/pending",
            },
          },
        },
      ],
      loader: {
        load: loadFoloEntries,
        annotation: FOLO_ANNOTATION_TEMPLATE,
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
            paths: ["/timeline/articles/list-:listId/*rest", "/timeline/all/list-:listId/*rest"],
          },
          patch: {
            params: {
              listId: "{{ scope.path.listId }}",
            },
            metadata: {
              title: {
                select: "title",
                transform: { op: "replace", search: " | Folo", replacement: "" },
              },
              home: "https://app.folo.is/timeline/all/list-{{ scope.params.listId }}/pending",
            },
          },
        },
      ],
      loader: {
        load: loadFoloEntries,
        annotation: FOLO_ANNOTATION_TEMPLATE,
      },
    },
  },
}
