import { myFetch } from "../utils/fetch"
import { $multiSelectParam } from "../utils/params"
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
    $source(
      {
        name: "default",
        params: {
          feeds: $multiSelectParam<FeedId>({
            title: "Feeds",
            options: [...FEED_OPTIONS],
            default: ["create", "ideas", "programmer", "share"],
          }),
        },
      },
      async ({ feeds }) => {
        const res = await Promise.all(
          feeds.map(k =>
            myFetch(`https://www.v2ex.com/feed/${k}.json`) as Promise<Res>),
        )
        return res.map(k => k.items).flat().map(k => ({
          title: k.title,
          timestamp: new Date(k.date_modified ?? k.date_published).getTime(),
          url: k.url,
          inline: {
            icon: k.author.avatar,
            text: "",
          },
          preview: {
            html: k.content_html,
          },
        })).sort((m, n) => m.timestamp < n.timestamp ? 1 : -1)
      },
    ),
  ],
})
