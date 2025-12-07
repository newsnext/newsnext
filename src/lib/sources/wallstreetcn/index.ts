import { defineSource } from "@/typings/source"
import { hot, live, news } from "./handlers"

export default defineSource({
  name: "Wall Street CN",
  color: "blue",
  home: "https://wallstreetcn.com/",
  lang: "zh-CN",
  interval: 1000 * 60 * 5,
  sub: {
    quick: {
      type: "realtime",
      title: "Breaking News",
      handler: live,
      default: true,
    },
    news: {
      title: "Latest",
      handler: news,
    },
    hot: {
      title: "Hot",
      type: "hottest",
      handler: hot,
    },
  },
})