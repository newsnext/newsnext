import { $source, $provider, $rssHubSourceLoader } from "../utils/source"
import { CommonSourceParams } from "../utils/params"

export default $provider({
  name: "RSSHub",
  color: "orange",
  home: "https://rsshub.app/",
  sources: {
    default: $source({
      interval: 1,
      ...$rssHubSourceLoader({
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
    }),
  },
})
