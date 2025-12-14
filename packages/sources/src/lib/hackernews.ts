import { Time } from "../typings/constants"
import { defineHtmlSourceGetter } from "../utils/html-source"
import { defineSource } from "../utils/source"

const createHNGetter = (sub: string) => defineHtmlSourceGetter(() => ({
  url: `https://news.ycombinator.com${sub}`,
  itemSelector: ".athing",
  fields: {
    title: ".titleline a",
    url: {
      selector: ".titleline a",
      attr: "href",
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
})).getter

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
      getter: createHNGetter("/"),
    },
    {
      type: "timeline",
      title: "Newest",
      id: "newest",
      home: "https://news.ycombinator.com/newest",
      interval: Time.Realtime,
      getter: createHNGetter("/newest"),
    },
    {
      title: "Show",
      id: "show",
      interval: Time.Common,
      home: "https://news.ycombinator.com/show",
      getter: createHNGetter("/show"),
    },
    {
      title: "Ask",
      id: "ask",
      interval: Time.Common,
      home: "https://news.ycombinator.com/ask",
      getter: createHNGetter("/ask"),
    },
  ],
})
