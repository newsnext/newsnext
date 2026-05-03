import { Time } from "../typings/constants"
import { $feed, $htmlFeedLoader, $provider } from "../utils/feed"

const baseURL = new URL("https://github.com")

export default $provider({
  name: "GitHub",
  home: "https://github.com/trending",
  color: "slate",
  feeds: {
    default: $feed({
      title: "Trending",
      interval: Time.Common,
      type: "hottest",
      ...$htmlFeedLoader(() => ({
        url: "https://github.com/trending?spoken_language_code=",
        itemSelector: "main .Box div[data-hpc] > article",
        fields: {
          title: {
            selector: ">h2 a",
            transform: val => val?.replace(/\n+/g, "").trim(),
          },
          url: {
            selector: ">h2 a",
            attr: "href",
            transform: val => val ? new URL(val, baseURL).toString() : undefined,
          },
          meta: {
            text: {
              selector: "[href$=stargazers]",
              transform: val => `✰ ${val?.replace(/\s+/g, "").trim()}`,
            },
          },
          detail: {
            text: {
              selector: ">p",
              transform: val => val?.replace(/\n+/g, "").trim(),
            },
          },
        },
      })),
    }),
  },
})
