import { normalizeTextParam } from "@newsnext/source/utils/params"
import { $radar, pageTitle } from "@newsnext/source/utils/radar"
import { $provider, $source } from "@newsnext/source/utils/source"

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
    $source({
      metadata: {
        key: "feed",
      },
      params: {
        feed: {
          type: "text",
          title: "Feed",
          default: "ideas",
          pattern: ".+",
          parse: normalizeTextParam,
        },
      },
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
      loader: {
        type: "json",
        url: ({ feed }) => `https://www.v2ex.com/feed/${feed}.json`,
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
      },
      capabilities: {
        network: ["www.v2ex.com"],
        cookies: [],
        browser: [],
      },
      cache: { version: 1, maxAge: "5m" },
    }),
  ],
})
