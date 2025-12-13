import { CommonSourceParams } from "../utils/params"
import { defineRSSHubSourceGetter, defineSource, defineSourceGetterWithParams } from "../utils/source"

export default defineSource({
  name: "RSSHub",
  color: "orange",
  home: "https://rsshub.app/",
  interval: 1,
  id: "default",
  ...defineSourceGetterWithParams({
    route: {
      type: "text",
      default: "/36kr/newsflashes",
      title: "Route",
    },
    host: {
      type: "text",
      default: "https://rsshub.rssforever.com",
      title: "Host",
    },
    type: CommonSourceParams.type,
  }, async ({ route, type, host }) => {
    if (type === "hottest") {
      return await defineRSSHubSourceGetter(route, host, {
        sorted: false,
      })()
    } else {
      return await defineRSSHubSourceGetter(route, host, {
        sorted: true,
      })()
    }
  }),
})
