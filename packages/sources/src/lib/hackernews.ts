import { Time } from "../typings/constants"
import { defineHtmlSourceFetcher, defineSource } from "../utils/source"

const createHNFetcher = (sub: string) => defineHtmlSourceFetcher(() => ({
  url: `https://news.ycombinator.com${sub}`,
  itemSelector: ".athing",
  fields: {
    title: ".titleline a",
    url: {
      selector: "",
      attr: "id",
      transform: (id: string | undefined) => {
        if (!id) return undefined
        return `https://news.ycombinator.com/item?id=${id}`
      },
    },
    updated: {
      // Use $el to access next sibling row
      transform: (_, $el) => {
        const date = $el.next("tr").find(".age").attr("title")?.split(" ")?.[1]
        return date ? Number(`${date}000`) : undefined
      },
    },
    extra: {
      info: {
        attr: "id",
        transform: (id, $el) => $el.next("tr").find(`#score_${id}`).text(),
      },
    },
  },
}))

export default defineSource({
  name: "Hacker News",
  color: "orange",
  category: "tech",
  home: "https://news.ycombinator.com/",
  sub: [
    {
      type: "hottest",
      title: "Hottest",
      id: "default",
      ...createHNFetcher("/"),
    },
    {
      type: "timeline",
      title: "Newest",
      id: "newest",
      home: "https://news.ycombinator.com/newest",
      interval: Time.Realtime,
      ...createHNFetcher("/newest"),
    },
    {
      title: "Show",
      id: "show",
      interval: Time.Common,
      home: "https://news.ycombinator.com/show",
      ...createHNFetcher("/show"),
    },
    {
      title: "Ask",
      id: "ask",
      interval: Time.Common,
      home: "https://news.ycombinator.com/ask",
      ...createHNFetcher("/ask"),
    },
  ],
})
