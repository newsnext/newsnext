import type { NewsItem } from "../typings/sources"
import * as cheerio from "cheerio"
import { Time } from "../typings/constants"
import { myFetch } from "../utils/fetch"
import { defineSelect } from "../utils/params"
import { defineSource, defineSourceGetterWithParams } from "../utils/source"

export default defineSource({
  name: "NEWS NOW",
  interval: Time.Test,
  type: "timeline",
  category: "world",
  color: "red",
  home: "https://www.newsnow.com",
  id: "news",
  ...defineSourceGetterWithParams(
    {
      locale: defineSelect<"us" | "uk" | "ng" | "ro" | "it" | "ca" | "au">({
        options: [
          { label: "US", value: "us" },
          { label: "UK", value: "uk" },
          { label: "Nigeria", value: "ng" },
          { label: "România", value: "ro" },
          { label: "Italia", value: "it" },
          { label: "Canada", value: "ca" },
          { label: "Australia", value: "au" },
        ],
        default: "us",
        title: "Locale",
      }),
      topic: {
        type: "text",
        default: "US",
        title: "Topic",
      },
    },
    async (params) => {
      const response = await myFetch(`https://www.newsnow.com/${params.locale}/${params.topic}?type=ln`)
      const $ = cheerio.load(response)
      const $main = $(".newsfeed .article")
      const news: NewsItem[] = []
      $main.each((_, el) => {
        const a = $(el).find(".article-card__headline")
        const url = a.attr("href")
        const title = a.text()
        const date = $(el).find("[data-timestamp]").attr("data-timestamp")
        const info = $(el).find(".article-publisher__name").text()
        if (url && title && date) {
          news.push({
            url,
            title,
            id: url,
            updated: Number(date) * 1000,
            extra: {
              info,
            },
          })
        }
      })
      return news.sort((m, n) => n.updated! > m.updated! ? 1 : -1)
    },
  ),
})
