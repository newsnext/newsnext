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
          patch: {
            params: {
              language: "{{ path.language }}",
              spokenLanguage: "{{ query.spoken_language_code }}",
              dateRange: "{{ query.since }}",
            },
            metadata: {
              title: "Trending {{ params.language }}",
            },
          },
          confidence: 0.95,
        },
      ],
      loader: {
        type: "html",
        url: "https://github.com/trending{% if params.language %}/{{ params.language | url_path }}{% endif %}?since={{ params.dateRange | url_query }}{% if params.spokenLanguage %}&spoken_language_code={{ params.spokenLanguage | url_query }}{% endif %}",
        items: "main .Box div[data-hpc] > article",
        fields: {
          title: {
            select: ">h2 a",
            template: "{{ value | normalize_whitespace }}",
          },
          url: {
            select: ">h2 a",
            attr: "href",
            template: "{{ value | absolute_url: requestUrl }}",
          },
          inline: {
            text: {
              select: "[href$=stargazers]",
              template: "✰ {{ value | normalize_whitespace }}",
            },
          },
          preview: {
            text: {
              select: ">p",
              template: "{{ value | normalize_whitespace }}",
            },
          },
        },
      },
      cache: "15m",
    },
  },
} satisfies ProviderConfig
