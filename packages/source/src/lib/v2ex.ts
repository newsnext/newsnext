import type { ProviderConfig } from "@newsnext/source/utils/source"

export default {
  title: "V2EX",
  color: "slate",
  home: "https://v2ex.com/",
  sources: {
    feed: {
      params: {
        feed: {
          type: "text",
          title: "Feed",
          default: "ideas",
          pattern: ".+",
          transforms: [{ type: "trim" }],
        },
      },
      radar: [
        {
          id: "v2ex-feed",
          match: {
            hosts: ["v2ex.com"],
            paths: ["/go/:feed"],
          },
          metaPatch: {
            title: {
              value: { type: "pageTitle" },
              transforms: [
                { type: "normalizeWhitespace" },
                { type: "extract", pattern: "^.*[>›]\\s*(.+)$" },
              ],
              fallback: "{{ params.feed }}",
            },
          },
          confidence: 0.9,
        },
      ],
      loader: {
        type: "json",
        url: "https://www.v2ex.com/feed/{{ params.feed | url_path }}.json",
        items: "items",
        fields: {
          title: "title",
          timestamp: {
            select: "date_modified || date_published",
            transforms: [{ type: "parseDate" }],
          },
          url: "url",
          inline: {
            icon: "author.avatar",
          },
          preview: {
            html: "content_html",
          },
        },
      },
      cache: "5m",
    },
  },
} satisfies ProviderConfig
