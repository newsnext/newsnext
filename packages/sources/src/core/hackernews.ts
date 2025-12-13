import type { NewsItem } from "../typings/sources"
import * as cheerio from "cheerio"
import { Time } from "../typings/constants"
import { myFetch } from "../utils/fetch"
import { defineSource } from "../utils/source"

async function fn(sub: string) {
  const baseURL = "https://news.ycombinator.com"
  const html: any = await myFetch(baseURL + sub)
  const $ = cheerio.load(html)
  const $main = $(".athing")
  const news: NewsItem[] = []
  $main.each((_, el) => {
    const a = $(el).find(".titleline a").first()
    // const url = a.attr("href")
    const title = a.text()
    const id = $(el).attr("id")
    const score = $(`#score_${id}`).text()
    const url = `${baseURL}/item?id=${id}`
    const date = $(el).next("tr").find(".age")?.attr("title")?.split(" ")?.[1]
    if (url && id && title && date) {
      news.push({
        url,
        title,
        id,
        updated: Number(`${date}000`),
        extra: {
          info: score,
        },
      })
    }
  })
  return news
}

export default defineSource({
  name: "Hacker News",
  color: "orange",
  category: "tech",
  home: "https://news.ycombinator.com/",
  sub: [
    {
      type: "hottest",
      title: "Hottest",
      id: "hot",
      getter: () => fn("/"),
    },
    {
      type: "timeline",
      title: "Newest",
      id: "newest",
      home: "https://news.ycombinator.com/newest",
      interval: Time.Realtime,
      getter: () => fn("/newest"),
    },
    {
      title: "Show",
      id: "show",
      interval: Time.Common,
      home: "https://news.ycombinator.com/show",
      getter: () => fn("/show"),
    },
    {
      title: "Ask",
      id: "ask",
      interval: Time.Common,
      home: "https://news.ycombinator.com/ask",
      getter: () => fn("/ask"),
    },
  ],
})
