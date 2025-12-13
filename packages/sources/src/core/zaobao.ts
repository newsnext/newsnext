import type { NewsItem } from "../typings/sources"
import { Buffer } from "node:buffer"
import * as cheerio from "cheerio"
import iconv from "iconv-lite"
import { Time } from "../typings/constants"
import { parseRelativeDate } from "../utils/date"
import { myFetch } from "../utils/fetch"
import { defineSource } from "../utils/source"

export default defineSource({
  name: "联合早报",
  interval: Time.Common,
  type: "timeline",
  category: "world",
  color: "red",
  home: "https://www.zaobao.com",
  id: "news",
  getter: async () => {
    const response: ArrayBuffer = await myFetch("https://www.zaochenbao.com/realtime/", {
      responseType: "arrayBuffer",
    })
    const base = "https://www.zaochenbao.com"
    const utf8String = iconv.decode(Buffer.from(response), "gb2312")
    const $ = cheerio.load(utf8String)
    const $main = $("div.list-block>a.item")
    const news: NewsItem[] = []
    $main.each((_, el) => {
      const a = $(el)
      const url = a.attr("href")
      const title = a.find(".eps")?.text()
      const date = a.find(".pdt10")?.text().replace(/-\s/g, " ")
      if (url && title && date) {
        news.push({
          url: base + url,
          title,
          id: url,
          updated: parseRelativeDate(date, "Asia/Shanghai").valueOf(),
        })
      }
    })
    return news.sort((m, n) => n.updated! > m.updated! ? 1 : -1)
  },
})
