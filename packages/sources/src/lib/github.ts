import { $provider, $source } from "../utils/source"

const baseURL = new URL("https://github.com")

export default $provider({
  title: "GitHub",
  home: "https://github.com/trending",
  color: "slate",
  sources: {
    default: $source.html(
      {
        title: "Trending",
        type: "hottest",
      },
      () => ({
        url: "https://github.com/trending?spoken_language_code=",
        items: "main .Box div[data-hpc] > article",
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
          inline: {
            text: {
              selector: "[href$=stargazers]",
              transform: val => `✰ ${val?.replace(/\s+/g, "").trim()}`,
            },
          },
          preview: {
            text: {
              selector: ">p",
              transform: val => val?.replace(/\n+/g, "").trim(),
            },
          },
        },
      }),
    ),
  },
})
