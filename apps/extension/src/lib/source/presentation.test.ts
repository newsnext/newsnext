import type { NewsItem } from "@/typings/source"
import { describe, expect, it } from "vitest"
import { getNewsItemsPresentation, getTimelineItemTimes } from "./presentation"

function createItem({ publishedAt, updatedAt }: {
  publishedAt?: number
  updatedAt?: number
} = {}): NewsItem {
  return {
    title: "Item",
    url: "https://example.com/item",
    publishedAt,
    updatedAt,
  }
}

describe("getTimelineItemTimes", () => {
  it("identifies items ordered from newest to oldest as a timeline", () => {
    expect(getTimelineItemTimes([
      createItem({ publishedAt: 3 }),
      createItem({ publishedAt: 2 }),
      createItem({ publishedAt: 2 }),
      createItem({ publishedAt: 1 }),
    ])).toEqual([3, 2, 2, 1])
  })

  it("identifies a single timestamped item as a timeline", () => {
    expect(getTimelineItemTimes([createItem({ updatedAt: 1 })])).toEqual([1])
  })

  it("uses publication order even when update times are not newest first", () => {
    const items = [
      createItem({ publishedAt: 3, updatedAt: 1 }),
      createItem({ publishedAt: 2, updatedAt: 3 }),
      createItem({ publishedAt: 1, updatedAt: 2 }),
    ]

    expect(getTimelineItemTimes(items)).toEqual([3, 2, 1])
  })

  it("falls back to update order when publication times are not newest first", () => {
    const items = [
      createItem({ publishedAt: 1, updatedAt: 3 }),
      createItem({ publishedAt: 3, updatedAt: 2 }),
      createItem({ publishedAt: 2, updatedAt: 1 }),
    ]

    expect(getTimelineItemTimes(items)).toEqual([3, 2, 1])
  })

  it.each([
    ["an empty list", []],
    ["an item without a timestamp", [createItem()]],
    ["partially timestamped items", [createItem({ publishedAt: 2 }), createItem()]],
    ["items with neither time ordered newest first", [
      createItem({ publishedAt: 1, updatedAt: 2 }),
      createItem({ publishedAt: 3, updatedAt: 1 }),
      createItem({ publishedAt: 2, updatedAt: 3 }),
    ]],
    ["items with a non-finite timestamp", [createItem({ publishedAt: Number.NaN })]],
  ])("does not return timeline times for %s", (_description, items) => {
    expect(getTimelineItemTimes(items)).toBeUndefined()
  })
})

describe("getNewsItemsPresentation", () => {
  it("uses an inferred timeline only when no type is declared", () => {
    const items = [createItem({ publishedAt: 2 }), createItem({ publishedAt: 1 })]

    expect(getNewsItemsPresentation(items)).toEqual({ type: "timeline", times: [2, 1] })
    expect(getNewsItemsPresentation(items, "ranking")).toEqual({ type: "ranking" })
    expect(getNewsItemsPresentation(items, "list")).toEqual({ type: "list" })
  })

  it("uses an unordered list for non-chronological items by default", () => {
    expect(getNewsItemsPresentation([createItem()])).toEqual({ type: "list" })
  })
})
