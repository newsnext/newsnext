import type * as cheerio from "cheerio"
import type { AnyNode } from "domhandler"
import { getFavicon } from "@newsnext/shared/utils"
import { Time } from "../typings/constants"
import { $provider, $source } from "../utils/source"

const createLoader = (sub: string) => () => ({
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
      transform: (_value: string | undefined, $el: cheerio.Cheerio<AnyNode>) => {
        const date = $el.next("tr").find(".age").attr("title")?.split(" ")?.[1]
        return date ? Number(`${date}000`) : undefined
      },
    },
    inline: {
      text: {
        attr: "id",
        transform: (id: string | undefined, $el: cheerio.Cheerio<AnyNode>) => $el.next("tr").find(`#score_${id}`).text(),
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
})

export default $provider({
  name: "Hacker News",
  color: "orange",
  home: "https://news.ycombinator.com/",
  sources: {
    default: $source.html(
      {
        type: "hottest",
        title: "Hottest",
      },
      createLoader("/"),
    ),
    newest: $source.html(
      {
        type: "timeline",
        title: "Newest",
        home: "https://news.ycombinator.com/newest",
        maxCacheAge: Time.Realtime,
      },
      createLoader("/newest"),
    ),
    show: $source.html(
      {
        title: "Show",
        maxCacheAge: Time.Common,
        home: "https://news.ycombinator.com/show",
      },
      createLoader("/show"),
    ),
    ask: $source.html(
      {
        title: "Ask",
        maxCacheAge: Time.Common,
        home: "https://news.ycombinator.com/ask",
      },
      createLoader("/ask"),
    ),
  },
})
