import type { NewsItem } from "@/typings/source"
import { describe, expect, it } from "vitest"
import { getNewsItemsPresentation, getTimelineItemTimes } from "./presentation"

function createItem({ publishedAt }: {
  publishedAt?: number
} = {}): NewsItem {
  return {
    title: "Item",
    url: "https://example.com/item",
    publishedAt,
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
    expect(getTimelineItemTimes([createItem({ publishedAt: 1 })])).toEqual([1])
  })

  it.each([
    ["an empty list", []],
    ["an item without a timestamp", [createItem()]],
    ["partially timestamped items", [createItem({ publishedAt: 2 }), createItem()]],
    ["items not ordered newest first", [
      createItem({ publishedAt: 1 }),
      createItem({ publishedAt: 3 }),
      createItem({ publishedAt: 2 }),
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
