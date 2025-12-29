import { Time } from "../typings/constants"
import { defineHtmlSourceFetcher, defineSource } from "../utils/source"

const baseURL = "https://github.com"

export default defineSource({
  name: "GitHub",
  title: "Trending",
  home: "https://github.com/trending",
  color: "slate",
  interval: Time.Common,
  type: "hottest",
  ...defineHtmlSourceFetcher(() => ({
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
        transform: val => `${baseURL}${val}`,
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
})
