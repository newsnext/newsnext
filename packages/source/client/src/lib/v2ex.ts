import { $textParam } from "@newsnext/source-shared/utils/params"
import { $provider, $source } from "@newsnext/source-shared/utils/source"

interface Res {
  version: string
  title: string
  description: string
  home_page_url: string
  source_url: string
  icon: string
  favicon: string
  items: {
    url: string
    date_modified?: string
    content_html: string
    date_published: string
    title: string
    id: string
    author: {
      url: string
      name: string
      avatar: string
    }
  }[]
}

export default $provider({
  title: "V2EX",
  color: "slate",
  home: "https://v2ex.com/",
  sources: [
    $source.json(
      {
        key: "feed",
        radar: [
          {
            id: "v2ex-feed",
            match: {
              hosts: ["v2ex.com"],
              paths: ["/go/:feed"],
            },
            title: {
              type: "value",
              value: { type: "pageTitle" },
              transforms: [
                { type: "normalizeWhitespace" },
                { type: "extract", pattern: "^.*[>›]\\s*(.+)$" },
              ],
              fallback: "{feed}",
            },
            params: {
              feed: { value: { type: "path", name: "feed" }, required: true },
            },
            confidence: 0.9,
          },
        ],
        params: {
          feed: $textParam({
            title: "Feed",
            default: "ideas",
            parse: value => String(value).trim(),
            validate: value => value.length > 0 || "Feed must not be empty.",
          }),
        },
      },
      ({ feed }) => ({
        url: `https://www.v2ex.com/feed/${feed}.json`,
        items: (res: Res) => res.items,
        fields: {
          title: "title",
          timestamp: item => new Date(item.date_modified ?? item.date_published).getTime(),
          url: "url",
          inline: {
            icon: item => item.author.avatar,
          },
          preview: {
            html: "content_html",
          },
        },
      }),
    ),
  ],
})
