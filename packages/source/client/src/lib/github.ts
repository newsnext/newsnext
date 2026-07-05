import { $selectParam, $textParam } from "@newsnext/source-shared/utils/params"
import { $provider, $source } from "@newsnext/source-shared/utils/source"

const baseURL = new URL("https://github.com")

const DATE_RANGE_OPTIONS = [
  { label: "Today", value: "daily" },
  { label: "This week", value: "weekly" },
  { label: "This month", value: "monthly" },
] as const

type DateRange = (typeof DATE_RANGE_OPTIONS)[number]["value"]

interface GitHubTrendingParams {
  language: string
  spokenLanguage: string
  dateRange: DateRange
}

export function buildGitHubTrendingUrl({
  language,
  spokenLanguage,
  dateRange,
}: GitHubTrendingParams): string {
  const normalizedLanguage = language.trim()
  const normalizedSpokenLanguage = spokenLanguage.trim()
  const url = new URL(
    normalizedLanguage
      ? `/trending/${encodeURIComponent(normalizedLanguage)}`
      : "/trending",
    baseURL,
  )

  url.searchParams.set("since", dateRange)
  if (normalizedSpokenLanguage) {
    url.searchParams.set("spoken_language_code", normalizedSpokenLanguage)
  }

  return url.toString()
}

export default $provider({
  title: "GitHub",
  home: "https://github.com/trending",
  color: "slate",
  sources: [
    $source.html(
      {
        key: "trending",
        title: "Trending",
        type: "hottest",
        radar: [
          {
            id: "github-trending",
            match: {
              hosts: ["github.com"],
              paths: ["/trending", "/trending/:language"],
            },
            title: { type: "template", value: "Trending {language}" },
            params: {
              language: { type: "path", name: "language" },
              spokenLanguage: { type: "query", name: "spoken_language_code" },
              dateRange: {
                value: { type: "first", values: [{ type: "query", name: "since" }, { type: "literal", value: "daily" }] },
                in: ["daily", "weekly", "monthly"],
              },
            },
            confidence: 0.95,
          },
        ],
        params: {
          language: $textParam({
            title: "Language",
            description: "Programming language slug used by GitHub Trending, such as javascript, go, or rust.",
            default: "",
          }),
          spokenLanguage: $textParam({
            title: "Spoken Language",
            description: "Repository description language code, such as en, zh, or ja.",
            default: "",
          }),
          dateRange: $selectParam<DateRange>({
            title: "Date range",
            options: [...DATE_RANGE_OPTIONS],
            default: "daily",
          }),
        },
      },
      params => ({
        url: buildGitHubTrendingUrl(params),
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
  ],
})
