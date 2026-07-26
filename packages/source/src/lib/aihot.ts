import type { ProviderConfig } from "@newsnext/source/utils/source"

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
        items: "items[?id && title && url]",
        fields: {
          title: "title",
          url: "url",
          timestamp: {
            select: "publishedAt",
            template: "{{ value | date_to_ms }}",
          },
          inline: {
            text: {
              template: "{{ item.source }}{% if item.category %} · {{ item.category }}{% endif %}",
            },
          },
          preview: {
            text: "summary",
          },
        },
      },
      cache: "5m",
    },
  },
} satisfies ProviderConfig
