import type { NewsItem } from "@/typings/source"
import { describe, expect, it } from "vitest"
import { isTimelineItems } from "./presentation"

function createItem(timestamp?: number): NewsItem {
  return {
    title: "Item",
    url: "https://example.com/item",
    timestamp,
  }
}

describe("isTimelineItems", () => {
  it("identifies items ordered from newest to oldest as a timeline", () => {
    expect(isTimelineItems([
      createItem(3),
      createItem(2),
      createItem(2),
      createItem(1),
    ])).toBe(true)
  })

  it("identifies a single timestamped item as a timeline", () => {
    expect(isTimelineItems([createItem(1)])).toBe(true)
  })

  it.each([
    ["an empty list", []],
    ["an item without a timestamp", [createItem()]],
    ["partially timestamped items", [createItem(2), createItem()]],
    ["items ordered from oldest to newest", [createItem(1), createItem(2)]],
    ["items with a non-finite timestamp", [createItem(Number.NaN)]],
  ])("identifies %s as a ranking", (_description, items) => {
    expect(isTimelineItems(items)).toBe(false)
  })
})
