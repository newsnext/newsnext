import { describe, expect, it } from "vitest"
import { buildGitHubTrendingUrl } from "../src/lib/github"

describe("github source", () => {
  it("builds the default trending URL with the selected date range", () => {
    expect(buildGitHubTrendingUrl({
      language: "",
      spokenLanguage: "",
      dateRange: "daily",
    })).toBe("https://github.com/trending?since=daily")
  })

  it("adds language and spoken language filters", () => {
    expect(buildGitHubTrendingUrl({
      language: "typescript",
      spokenLanguage: "en",
      dateRange: "weekly",
    })).toBe("https://github.com/trending/typescript?since=weekly&spoken_language_code=en")
  })
})
