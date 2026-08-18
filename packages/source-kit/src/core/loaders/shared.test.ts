import type { NewsItem } from "../../types"
import { describe, expect, it } from "vitest"
import {
  isCompleteLoaderFieldGroup,
  normalizeLoaderNestedValue,
  sortLoaderItemsByTimestamp,
  validateSortByTimestamp,
} from "./shared"

describe("loader field groups", () => {
  it("normalizes stats without turning empty values into zero", () => {
    expect(normalizeLoaderNestedValue("stats", "12")).toBe(12)
    expect(normalizeLoaderNestedValue("stats", "")).toBeUndefined()
    expect(normalizeLoaderNestedValue("attributes", false)).toBe(false)
  })

  it("requires identity fields for semantic groups", () => {
    expect(isCompleteLoaderFieldGroup("author", { home: "/author" })).toBe(false)
    expect(isCompleteLoaderFieldGroup("icon", { kind: "author" })).toBe(false)
    expect(isCompleteLoaderFieldGroup("stats", { likes: 0 })).toBe(true)
  })
})

describe("sortLoaderItemsByTimestamp", () => {
  const items: NewsItem[] = [
    { title: "Middle", url: "https://example.com/middle", publishedAt: 2_000 },
    { title: "Undated", url: "https://example.com/undated" },
    { title: "Oldest", url: "https://example.com/oldest", publishedAt: 1_000 },
    { title: "Newest", url: "https://example.com/newest", updatedAt: 3_000 },
  ]

  it("sorts timestamps newest first with missing timestamps last", () => {
    expect(sortLoaderItemsByTimestamp([...items], true).map(item => item.title))
      .toEqual(["Newest", "Middle", "Oldest", "Undated"])
  })

  it("prefers publication time when an item also has an update time", () => {
    const publishedFirst: NewsItem[] = [
      {
        title: "Published later",
        url: "https://example.com/later",
        publishedAt: 2_000,
        updatedAt: 2_000,
      },
      {
        title: "Updated later",
        url: "https://example.com/updated",
        publishedAt: 1_000,
        updatedAt: 3_000,
      },
    ]

    expect(sortLoaderItemsByTimestamp(publishedFirst, true).map(item => item.title))
      .toEqual(["Published later", "Updated later"])
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
