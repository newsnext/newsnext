import { $selectParam } from "../utils/params"
import { $provider, $source } from "../utils/source"

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

const FEED_OPTIONS = [
  { label: "Create", value: "create" },
  { label: "Ideas", value: "ideas" },
  { label: "Programmer", value: "programmer" },
  { label: "Share", value: "share" },
] as const

type FeedId = (typeof FEED_OPTIONS)[number]["value"]

export default $provider({
  title: "V2EX",
  color: "slate",
  home: "https://v2ex.com/",
  sources: [
    $source.json(
      {
        key: "feed",
        params: {
          feed: $selectParam<FeedId>({
            title: "Feed",
            options: [...FEED_OPTIONS],
            default: "ideas",
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
