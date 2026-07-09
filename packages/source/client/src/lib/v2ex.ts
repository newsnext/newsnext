import { $textParam } from "@newsnext/source-shared/utils/params"
import { $radar, pageTitle } from "@newsnext/source-shared/utils/radar"
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
          $radar({
            id: "v2ex-feed",
            hosts: ["v2ex.com"],
            path: "/go/:feed",
            meta: {
              title: pageTitle()
                .normalize()
                .extract("^.*[>›]\\s*(.+)$")
                .fallback("{feed}"),
            },
            confidence: 0.9,
          }),
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
