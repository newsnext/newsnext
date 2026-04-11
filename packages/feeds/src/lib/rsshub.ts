import { $feed, $provider, $rssHubFeedLoader } from "../utils/feed"
import { CommonFeedParams } from "../utils/params"

export default $provider({
  name: "RSSHub",
  color: "orange",
  home: "https://rsshub.app/",
  feeds: {
    default: $feed({
      interval: 1,
      ...$rssHubFeedLoader({
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
        type: CommonFeedParams.type,
      }, ({ route, type, host }) => ({
        route,
        host,
        options: {
          sorted: type !== "hottest",
        },
      })),
    }),
  },
})
