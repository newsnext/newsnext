import type { NewsItem } from "@/typings/source"
import { describe, expect, it } from "vitest"
import {
  createBoardFilter,
  filterBoardItems,
  normalizeBoardFilter,
  parseBoardFilterKeywords,
} from "./board-filter"

const ITEMS: NewsItem[] = [
  { title: "AI release", url: "https://example.com/ai" },
  {
    title: "Product update",
    url: "https://example.com/product",
    inline: { text: "New browser tools" },
  },
  {
    title: "Market report",
    url: "https://example.com/market",
    inline: { html: "<strong>Crypto</strong> prices" },
  },
]

describe("board filter", () => {
  it("parses, trims, and deduplicates comma or newline-separated keywords", () => {
    expect(parseBoardFilterKeywords(" AI, browser\nai ")).toEqual(["AI", "browser"])
  })

  it("returns no filter when the keyword field is empty", () => {
    expect(createBoardFilter("include", " , \n ")).toBeUndefined()
  })

  it("includes items matching titles or inline content without case sensitivity", () => {
    expect(filterBoardItems(ITEMS, {
      mode: "include",
      keywords: ["ai", "CRYPTO"],
    })).toEqual([ITEMS[0], ITEMS[2]])
  })

  it("excludes items matching any keyword", () => {
    expect(filterBoardItems(ITEMS, {
      mode: "exclude",
      keywords: ["browser"],
    })).toEqual([ITEMS[0], ITEMS[2]])
  })

  it("preserves the original array when no filter is active", () => {
    expect(filterBoardItems(ITEMS, undefined)).toBe(ITEMS)
  })

  it("preserves an empty array while a filter is active", () => {
    const items: NewsItem[] = []
    expect(filterBoardItems(items, {
      mode: "include",
      keywords: ["AI"],
    })).toBe(items)
  })

  it("normalizes persisted filters and rejects invalid modes", () => {
    expect(normalizeBoardFilter({
      mode: "include",
      keywords: [" AI ", "ai", "browser"],
    })).toEqual({ mode: "include", keywords: ["AI", "browser"] })
    expect(normalizeBoardFilter({
      mode: "other",
      keywords: ["AI"],
    })).toBeUndefined()
  })
})
