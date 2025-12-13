import type { NewsItem } from "../typings/sources"
import * as cheerio from "cheerio"
import { Time } from "../typings/constants"
import { myFetch } from "../utils/fetch"
import { defineSource } from "../utils/source"

export default defineSource({
  name: "GitHub",
  title: "Trending",
  id: "trending",
  home: "https://github.com/trending",
  color: "slate",
  interval: Time.Common,
  type: "hottest",
  getter: async () => {
    const baseURL = "https://github.com"
    const html: any = await myFetch("https://github.com/trending?spoken_language_code=")
    const $ = cheerio.load(html)
    const $main = $("main .Box div[data-hpc] > article")
    const news: NewsItem[] = []
    $main.each((_, el) => {
      const a = $(el).find(">h2 a")
      const title = a.text().replace(/\n+/g, "").trim()
      const url = a.attr("href")
      const star = $(el).find("[href$=stargazers]").text().replace(/\s+/g, "").trim()
      const desc = $(el).find(">p").text().replace(/\n+/g, "").trim()
      if (url && title) {
        news.push({
          url: `${baseURL}${url}`,
          title,
          id: url,
          extra: {
            info: `✰ ${star}`,
            hover: desc,
          },
        })
      }
    })
    return news
  },
})
