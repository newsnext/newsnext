import type * as cheerio from "cheerio"
import type { AnyNode } from "domhandler"
import { getFavicon } from "@newsnext/shared/utils"
import { $provider, $source } from "@newsnext/source/utils/source"

const createLoader = (sub: string) => ({
  type: "html" as const,
  url: `https://news.ycombinator.com${sub}`,
  items: ".athing",
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
  title: "Hacker News",
  color: "orange",
  home: "https://news.ycombinator.com/",
  sources: [
    $source({
      metadata: {
        key: "top",
        type: "hottest",
        title: "Hottest",
      },
      loader: createLoader("/"),
      capabilities: {
        network: ["news.ycombinator.com"],
        cookies: [],
        browser: [],
      },
      cache: { version: 1, maxAge: "5m" },
    }),
    $source({
      metadata: {
        key: "newest",
        type: "timeline",
        title: "Newest",
        home: "https://news.ycombinator.com/newest",
      },
      loader: createLoader("/newest"),
      capabilities: {
        network: ["news.ycombinator.com"],
        cookies: [],
        browser: [],
      },
      cache: { version: 1, maxAge: "1m" },
    }),
    $source({
      metadata: {
        key: "show",
        title: "Show",
        home: "https://news.ycombinator.com/show",
      },
      loader: createLoader("/show"),
      capabilities: {
        network: ["news.ycombinator.com"],
        cookies: [],
        browser: [],
      },
      cache: { version: 1, maxAge: "5m" },
    }),
    $source({
      metadata: {
        key: "ask",
        title: "Ask",
        home: "https://news.ycombinator.com/ask",
      },
      loader: createLoader("/ask"),
      capabilities: {
        network: ["news.ycombinator.com"],
        cookies: [],
        browser: [],
      },
      cache: { version: 1, maxAge: "5m" },
    }),
  ],
})
