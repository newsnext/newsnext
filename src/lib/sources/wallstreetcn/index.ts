import { defineSource } from "@/typings/source"
import { hot, live, news } from "./handlers"

export default defineSource({
  name: "华尔街见闻",
  color: "blue",
  home: "https://wallstreetcn.com/",
  lang: "zh-CN",
  interval: 1000 * 60 * 5,
  sub: {
    quick: {
      type: "realtime",
      title: "快讯",
      handler: live,
      default: true,
    },
    news: {
      title: "最新",
      handler: news,
    },
    hot: {
      title: "最热",
      type: "hottest",
      handler: hot,
    },
  },
})