import type { ProviderConfig } from "@newsnext/source/utils/source"
import type * as cheerio from "cheerio"
import type { AnyNode } from "domhandler"
import { getFavicon } from "@newsnext/shared/utils"

const createLoader = (sub: string) => ({
  type: "html" as const,
  url: `https://news.ycombinator.com${sub}`,
  items: ".athing",
  fields: {
    title: ".titleline>a",
    url: {
      selector: "",
      attr: "id",
      template: "https://news.ycombinator.com/item?id={{ value | url_query }}",
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

export default {
  title: "Hacker News",
  color: "orange",
  home: "https://news.ycombinator.com/",
  sources: {
    top: {
      type: "hottest",
      title: "Hottest",
      loader: createLoader("/"),
      cache: "5m",
    },
    newest: {
      type: "timeline",
      title: "Newest",
      home: "https://news.ycombinator.com/newest",
      loader: createLoader("/newest"),
      cache: "1m",
    },
    show: {
      title: "Show",
      home: "https://news.ycombinator.com/show",
      loader: createLoader("/show"),
      cache: "5m",
    },
    ask: {
      title: "Ask",
      home: "https://news.ycombinator.com/ask",
      loader: createLoader("/ask"),
      cache: "5m",
    },
  },
} satisfies ProviderConfig
