import { Time } from "../typings/constants"
import { defineHtmlSourceGetter } from "../utils/html-source"
import { defineSource } from "../utils/source"

const baseURL = "https://github.com"

export default defineSource({
  name: "GitHub",
  title: "Trending",
  id: "trending",
  home: "https://github.com/trending",
  color: "slate",
  interval: Time.Common,
  type: "hottest",
  ...defineHtmlSourceGetter(() => ({
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
      extra: {
        info: {
          selector: "[href$=stargazers]",
          transform: val => `✰ ${val?.replace(/\s+/g, "").trim()}`,
        },
        hover: {
          selector: ">p",
          transform: val => val?.replace(/\n+/g, "").trim(),
        },
      },
    },
  })),
})
