import { CommonSourceParams } from "../utils/params"
import { $provider, $source } from "../utils/source"

export default $provider({
  title: "RSSHub",
  color: "orange",
  home: "https://rsshub.app/",
  sources: [
    $source.rssHub(
      {
        name: "default",
        title: "36 氪",
        params: {
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
        },
      },
      ({ route, type, host }) => ({
        route,
        host,
        options: {
          sorted: type !== "hottest",
        },
      }),
    ),
  ],
})
