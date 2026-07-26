import type { ProviderConfig } from "@newsnext/source/utils/source"

const createLoader = (sub: string) => ({
  type: "html" as const,
  url: `https://news.ycombinator.com${sub}`,
  items: ".athing",
  fields: {
    title: ".titleline>a",
    url: {
      select: "",
      attr: "id",
      template: "https://news.ycombinator.com/item?id={{ value | url_query }}",
    },
    timestamp: {
      traverse: { type: "next" as const, selector: "tr" },
      select: ".age",
      attr: "title",
      template: "{{ value | split: ' ' | last | times: 1000 }}",
    },
    inline: {
      text: {
        traverse: { type: "next" as const, selector: "tr" },
        select: ".score",
      },
      icon: {
        select: ".titleline>a",
        attr: "href",
        template: "{{ value | absolute_url: requestUrl | favicon_url }}",
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
      metadata: {
        type: "hottest",
        title: "Hottest",
      },
      loader: createLoader("/"),
      cache: "5m",
    },
    newest: {
      metadata: {
        type: "timeline",
        title: "Newest",
        home: "https://news.ycombinator.com/newest",
      },
      loader: createLoader("/newest"),
      cache: "1m",
    },
    show: {
      metadata: {
        title: "Show",
        home: "https://news.ycombinator.com/show",
      },
      loader: createLoader("/show"),
      cache: "5m",
    },
    ask: {
      metadata: {
        title: "Ask",
        home: "https://news.ycombinator.com/ask",
      },
      loader: createLoader("/ask"),
      cache: "5m",
    },
  },
} satisfies ProviderConfig
