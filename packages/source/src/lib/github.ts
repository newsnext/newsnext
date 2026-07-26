import type { ProviderConfig } from "@newsnext/source/utils/source"

const DATE_RANGE_OPTIONS = [
  { label: "Today", value: "daily" },
  { label: "This week", value: "weekly" },
  { label: "This month", value: "monthly" },
] as const

export default {
  title: "GitHub",
  home: "https://github.com/trending",
  color: "slate",
  sources: {
    trending: {
      title: "Trending",
      type: "hottest",
      params: {
        language: {
          type: "text",
          title: "Language",
          description: "Programming language slug used by GitHub Trending, such as javascript, go, or rust.",
          default: "",
        },
        spokenLanguage: {
          type: "text",
          title: "Spoken Language",
          description: "Repository description language code, such as en, zh, or ja.",
          default: "",
        },
        dateRange: {
          type: "select",
          title: "Date range",
          values: DATE_RANGE_OPTIONS,
          default: "daily",
        },
      },
      radar: [
        {
          id: "github-trending",
          match: {
            hosts: ["github.com"],
            paths: ["/trending", "/trending/:language"],
          },
          paramsPatch: {
            spokenLanguage: {
              value: { type: "query", name: "spoken_language_code" },
              fallback: "",
            },
            dateRange: {
              value: { type: "query", name: "since" },
              fallback: "daily",
            },
          },
          metaPatch: {
            title: "Trending {{ params.language }}",
          },
          confidence: 0.95,
        },
      ],
      loader: {
        type: "html",
        url: "https://github.com/trending{% assign language = params.language | strip %}{% if language %}/{{ language | url_path }}{% endif %}?since={{ params.dateRange | url_query }}{% assign spoken_language = params.spokenLanguage | strip %}{% if spoken_language %}&spoken_language_code={{ spoken_language | url_query }}{% endif %}",
        items: "main .Box div[data-hpc] > article",
        fields: {
          title: {
            selector: ">h2 a",
            transforms: [{ type: "normalizeWhitespace" }],
          },
          url: {
            selector: ">h2 a",
            attr: "href",
            template: "https://github.com{{ value }}",
          },
          inline: {
            text: {
              selector: "[href$=stargazers]",
              transforms: [
                { type: "normalizeWhitespace" },
                { type: "prepend", value: "✰ " },
              ],
            },
          },
          preview: {
            text: {
              selector: ">p",
              transforms: [{ type: "normalizeWhitespace" }],
            },
          },
        },
      },
      cache: "15m",
    },
  },
} satisfies ProviderConfig
