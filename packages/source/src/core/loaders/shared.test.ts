import type { NewsItem } from "../../types"
import { describe, expect, it } from "vitest"
import { sortLoaderItemsByTimestamp, validateSortByTimestamp } from "./shared"

describe("sortLoaderItemsByTimestamp", () => {
  const items: NewsItem[] = [
    { title: "Middle", url: "https://example.com/middle", timestamp: 2_000 },
    { title: "Undated", url: "https://example.com/undated" },
    { title: "Oldest", url: "https://example.com/oldest", timestamp: 1_000 },
    { title: "Newest", url: "https://example.com/newest", timestamp: 3_000 },
  ]

  it("sorts timestamps newest first with missing timestamps last", () => {
    expect(sortLoaderItemsByTimestamp([...items], true).map(item => item.title))
      .toEqual(["Newest", "Middle", "Oldest", "Undated"])
  })

  it("preserves the selected order when sorting is disabled", () => {
    expect(sortLoaderItemsByTimestamp([...items], false)).toEqual(items)
  })
})

describe("validateSortByTimestamp", () => {
  it("rejects unsupported sort configurations", () => {
    expect(() => validateSortByTimestamp("timestamp", "source.loader.sortByTimestamp"))
      .toThrowError("source.loader.sortByTimestamp must be a boolean")
  })
})
