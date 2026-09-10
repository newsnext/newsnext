import { describe, expect, it } from "vitest"
import { parseWidgetItems } from "./widget-items"

describe("parseWidgetItems", () => {
  it("preserves semantic item data and permits empty results", () => {
    const item = { title: "News", url: "https://example.com/news", publishedAt: 1788950000000, stats: { score: 42 }, content: { text: "Details" } }
    expect(parseWidgetItems({ items: [{ value: item, instanceId: "source" }] })).toEqual([item])
    expect(parseWidgetItems({ items: [] })).toEqual([])
  })
  it("validates the full shared item contract before native rendering", () => {
    expect(() => parseWidgetItems({ items: [{ value: { title: "News", url: "https://example.com", stats: { likes: -1 } } }] })).toThrow()
    expect(() => parseWidgetItems({ items: [{ value: { title: "News", url: "https://example.com", publishedAt: "yesterday" } }] })).toThrow()
    expect(() => parseWidgetItems({ items: [{}] })).toThrow("invalid item entry")
    expect(() => parseWidgetItems({})).toThrow("items array")
    expect(() => parseWidgetItems({ items: Array.from({ length: 501 }, () => ({ value: {} })) })).toThrow("at most 500")
  })
  it("does not apply the 50-item Source collection limit to aggregated Widget data", () => {
    const items = Array.from({ length: 80 }, (_, index) => ({ value: { title: `Item ${index}`, url: `https://example.com/${index}` } }))
    expect(parseWidgetItems({ items })).toHaveLength(80)
  })
})
