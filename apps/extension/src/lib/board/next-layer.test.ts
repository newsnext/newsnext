import { describe, expect, it } from "vitest"
import { mixSourceItems } from "./next-layer"

function item(title: string, timestamp?: number) {
  return { title, url: `https://example.com/${title}`, publishedAt: timestamp }
}

describe("mixSourceItems", () => {
  it("sorts items from every source into a newest-first timeline", () => {
    const result = mixSourceItems([
      { source: "alpha", updatedAt: 100, items: [item("a1", 400), item("a2")] },
      { source: "beta", updatedAt: 300, items: [item("b1", 500), item("b2", 200)] },
    ])

    expect(result.map(({ item: newsItem, rank, source, timestamp }) => ({
      title: newsItem.title,
      rank,
      source,
      timestamp,
    }))).toEqual([
      { title: "b1", rank: 1, source: "beta", timestamp: 500 },
      { title: "a1", rank: 1, source: "alpha", timestamp: 400 },
      { title: "b2", rank: 2, source: "beta", timestamp: 200 },
      { title: "a2", rank: 2, source: "alpha", timestamp: 100 },
    ])
  })

  it("uses rank and source order to mix items with the same timestamp", () => {
    expect(mixSourceItems([
      { source: "alpha", updatedAt: 100, items: [item("a1"), item("a2")] },
      { source: "beta", updatedAt: 100, items: [item("b1"), item("b2")] },
    ]).map(({ item: newsItem }) => newsItem.title)).toEqual([
      "a1",
      "b1",
      "a2",
      "b2",
    ])
  })
})
