import { parseRelativeDate } from "../utils/date"
import { $provider, $source } from "../utils/source"

export default $provider({
  title: "HTML Parser",
  color: "orange",
  home: "https://html.com/",
  sources: [
    $source.html(
      {
        key: "default",
        title: "36 氪",
        home: "https://www.36kr.com/newsflashes",
        params: {
          url: {
            type: "url",
            default: "https://www.36kr.com/newsflashes",
            title: "Target URL",
          },
          decoding: {
            type: "text",
            default: "UTF-8",
            title: "Decoding",
          },
          items: {
            type: "text",
            default: ".newsflash-item",
            title: "Items Selector",
          },
          filter: {
            type: "text",
            default: "",
            title: "Filter",
          },
          titleSelector: {
            type: "text",
            default: "a.item-title",
            title: "Title Selector",
          },
          linkSelector: {
            type: "text",
            default: "a.item-title",
            title: "Link Selector",
          },
        },
      },
      ({ url, decoding, items, filter, titleSelector, linkSelector }) => ({
        url,
        decoding,
        items,
        filter: filter || undefined,
        fields: {
          title: titleSelector,
          url: {
            selector: linkSelector,
            attr: "href",
            transform: (href: string | undefined) => {
              if (!href) return undefined
              return new URL(href, url).toString()
            },
          },
          timestamp: {
            selector: ".time",
            transform: (relativeDate: string | undefined) => {
              if (!relativeDate) return undefined
              return parseRelativeDate(relativeDate, "Asia/Shanghai").getTime()
            },
          },
        },
      }),
    ),
  ],
})
