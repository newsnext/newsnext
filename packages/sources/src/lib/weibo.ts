import { Time } from "../typings/constants"
import { myFetch } from "../utils/fetch"
import { defineHtmlSourceFetcher, defineSource } from "../utils/source"

const baseurl = "https://s.weibo.com"
const flagUrls = {
  新: "https://simg.s.weibo.com/moter/flags/1_0.png",
  热: "https://simg.s.weibo.com/moter/flags/2_0.png",
  爆: "https://simg.s.weibo.com/moter/flags/4_0.png",
}

export default defineSource({
  name: "微博",
  home: "https://s.weibo.com/top/summary?cate=realtimehot",
  color: "red",
  category: "china",
  interval: Time.Common,
  type: "hottest",
  ...defineHtmlSourceFetcher(() => ({
    url: "https://s.weibo.com/top/summary?cate=realtimehot",
    fetch: async (url) => {
      return myFetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
          "Cookie": "SUB=_2AkMWIuNSf8NxqwJRmP8dy2rhaoV2ygrEieKgfhKJJRMxHRl-yT9jqk86tRB6PaLNvQZR6zYUcYVT1zSjoSreQHidcUq7",
          "Referer": url,
        },
      })
    },
    // Use nth-child to skip the header row
    itemSelector: "#pl_top_realtimehot table tbody tr:nth-child(n+2)",
    fields: {
      title: "td.td-02 a",
      url: {
        selector: "td.td-02 a",
        attr: "href",
        transform: (href) => {
          if (!href || href.includes("javascript:void(0);")) return undefined
          return `${baseurl}${href}`
        },
      },
      info: {
        icon: {
          selector: "td.td-03",
          transform: (val) => {
            const flagUrl = flagUrls[val as keyof typeof flagUrls]
            if (!flagUrl) return undefined
            return { url: flagUrl, scale: 1.5 }
          },
        },
      },
    },
  })),
})
