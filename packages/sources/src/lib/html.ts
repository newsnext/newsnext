import { parseRelativeDate } from "../utils/date"
import { $htmlSourceLoader, $provider, $source } from "../utils/source"

export default $provider({
  name: "HTML Parser",
  color: "orange",
  home: "https://html.com/",
  sources: {
    default: $source({
      ...$htmlSourceLoader({
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
        itemSelector: {
          type: "text",
          default: ".newsflash-item",
          title: "Item Selector",
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
      }, ({ url, decoding, itemSelector, titleSelector, linkSelector }) => {
        const baseURL = new URL(url.includes("36kr.com") ? "https://www.36kr.com" : url)
        return {
          url,
          decoding,
          itemSelector,
          fields: {
            title: titleSelector,
            url: {
              selector: linkSelector,
              attr: "href",
              transform: (href: string | undefined) => {
                if (!href) return undefined
                return new URL(href, baseURL).toString()
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
        }
      }),
    }),
  },
})
