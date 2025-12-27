import { parseRelativeDate } from "../utils/date"
import { defineHtmlSourceFetcher, defineSource } from "../utils/source"

export default defineSource({
  name: "HTML Parser",
  color: "blue",
  home: "https://html.com/",
  ...defineHtmlSourceFetcher({
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
    const baseURL = url.includes("36kr.com") ? "https://www.36kr.com" : new URL(url).origin
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
            return href.startsWith("http") ? href : `${baseURL}${href}`
          },
        },
        timestamp: {
          selector: ".time",
          transform: (relativeDate: string | undefined) => {
            if (!relativeDate) return undefined
            return parseRelativeDate(relativeDate, "Asia/Shanghai")
          },
        },
      },
    }
  }),
})
