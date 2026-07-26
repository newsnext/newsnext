import type { ProviderConfig } from "@newsnext/source/utils/source"

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

export default {
  title: "AIHot",
  color: "blue",
  home: "https://aihot.virxact.com",
  category: "tech",
  sources: {
    all: {
      type: "timeline",
      loader: {
        type: "json",
        url: AIHOT_API_URL,
        items: (response: AIHotResponse) => response.items?.filter(item => item.id && item.title && item.url) ?? [],
        fields: {
          title: "title",
          url: "url",
          timestamp: item => item.publishedAt ? new Date(item.publishedAt).getTime() : 0,
          inline: {
            text: item => item.category ? `${item.source} · ${item.category}` : item.source,
          },
          preview: {
            text: item => item.summary,
          },
        },
      },
      cache: "5m",
    },
  },
} satisfies ProviderConfig
