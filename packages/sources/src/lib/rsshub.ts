import { CommonSourceParams } from "../utils/params"
import { defineRSSHubSourceGetter, defineSource } from "../utils/source"

export default defineSource({
  name: "RSSHub",
  color: "orange",
  home: "https://rsshub.app/",
  interval: 1,
  ...defineRSSHubSourceGetter({
    route: {
      type: "text",
      default: "/36kr/newsflashes",
      title: "Route",
    },
    host: {
      type: "url",
      default: "https://rsshub.rssforever.com",
      title: "Host",
    },
    type: CommonSourceParams.type,
  }, ({ route, type, host }) => ({
    route,
    host,
    options: {
      sorted: type !== "hottest",
    },
  })),
})
