import { getFavicon } from "@newsnext/shared/utils"
import { Time } from "../typings/constants"
import { $feed, $htmlFeedLoader, $provider } from "../utils/feed"

const createHNFetcher = (sub: string) => $htmlFeedLoader(() => ({
  url: `https://news.ycombinator.com${sub}`,
  itemSelector: ".athing",
  fields: {
    title: ".titleline>a",
    url: {
      selector: "",
      attr: "id",
      transform: (id: string | undefined) => {
        if (!id) return undefined
        return `https://news.ycombinator.com/item?id=${id}`
      },
    },
    timestamp: {
      // Use $el to access next sibling row
      transform: (_, $el) => {
        const date = $el.next("tr").find(".age").attr("title")?.split(" ")?.[1]
        return date ? Number(`${date}000`) : undefined
      },
    },
    meta: {
      text: {
        attr: "id",
        transform: (id, $el) => $el.next("tr").find(`#score_${id}`).text(),
      },
      icon: {
        selector: ".titleline>a",
        attr: "href",
        transform: (href: string | undefined) => {
          if (!href) return undefined
          if (href.startsWith("item")) href = `https://news.ycombinator.com/${href}`
          const src = getFavicon(href)
          if (!src) return undefined
          return { href, src }
        },
      },
    },
  },
}))

export default $provider({
  name: "Hacker News",
  color: "orange",
  category: "tech",
  home: "https://news.ycombinator.com/",
  feeds: {
    default: $feed({
      type: "hottest",
      title: "Hottest",
      ...createHNFetcher("/"),
    }),
    newest: $feed({
      type: "timeline",
      title: "Newest",
      home: "https://news.ycombinator.com/newest",
      interval: Time.Realtime,
      ...createHNFetcher("/newest"),
    }),
    show: $feed({
      title: "Show",
      interval: Time.Common,
      home: "https://news.ycombinator.com/show",
      ...createHNFetcher("/show"),
    }),
    ask: $feed({
      title: "Ask",
      interval: Time.Common,
      home: "https://news.ycombinator.com/ask",
      ...createHNFetcher("/ask"),
    }),
  },
})
