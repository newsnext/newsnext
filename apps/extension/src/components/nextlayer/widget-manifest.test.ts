import { describe, expect, it } from "vitest"
import { parseWidgetCatalog } from "./widget-manifest"

const SERVER_URL = "http://127.0.0.1:43121"
describe("parseWidgetCatalog", () => {
  it("accepts shared parameter definitions and rejects invalid defaults", () => {
    const widget = {
      id: "feed",
      title: "Feed",
      height: 4,
      minHeight: 1,
      width: 6,
      minWidth: 1,
      view: { type: "live-card", query: "feed" },
      params: { limit: { type: "number", title: "Limit", default: 10, min: 1, max: 20 } },
    }
    expect(parseWidgetCatalog([widget], SERVER_URL)[0]?.params).toEqual(widget.params)
    expect(() => parseWidgetCatalog([{
      ...widget,
      params: { limit: { ...widget.params.limit, default: 30 } },
    }], SERVER_URL)).toThrow("default is invalid")
  })

  it("accepts widgets served by the declared loopback origin", () => {
    expect(parseWidgetCatalog([{
      height: 4,
      id: "headlines",
      minHeight: 2,
      minWidth: 2,
      title: "Headlines",
      url: `${SERVER_URL}/widgets/headlines/index.html`,
      width: 6,
    }], SERVER_URL)).toHaveLength(1)
  })

  it("resolves an omitted palette and rejects unsupported colors", () => {
    const widget = {
      height: 4,
      id: "headlines",
      minHeight: 2,
      minWidth: 2,
      title: "Headlines",
      url: `${SERVER_URL}/widgets/headlines/index.html`,
      width: 6,
    }
    expect(parseWidgetCatalog([widget], SERVER_URL)[0]?.color).toBe("slate")
    expect(parseWidgetCatalog([{ ...widget, color: "teal" }], SERVER_URL)[0]?.color).toBe("teal")
    expect(() => parseWidgetCatalog([{ ...widget, color: "invalid" }], SERVER_URL)).toThrow("invalid Widget manifest")
  })

  it("rejects entry URLs from another origin", () => {
    expect(() => parseWidgetCatalog([{
      height: 4,
      id: "headlines",
      minHeight: 2,
      minWidth: 2,
      title: "Headlines",
      url: "https://example.com/widgets/headlines/index.html",
      width: 6,
    }], SERVER_URL)).toThrow("invalid entry URL")
  })

  it("rejects duplicate widget IDs", () => {
    const widget = {
      height: 4,
      id: "headlines",
      minHeight: 2,
      minWidth: 2,
      title: "Headlines",
      url: `${SERVER_URL}/widgets/headlines/index.html`,
      width: 6,
    }
    expect(() => parseWidgetCatalog([widget, widget], SERVER_URL)).toThrow("Duplicate widget ID")
  })
})

describe("built-in Widget UI", () => {
  const widget = { id: "feed", title: "Feed", height: 4, minHeight: 2, width: 4, minWidth: 2, view: { type: "live-card", query: "items" } }
  it("accepts a data-only Widget without an HTML entry", () => {
    const [manifest] = parseWidgetCatalog([widget], SERVER_URL)
    expect(manifest?.view).toEqual({ type: "live-card", query: "items" })
    expect(manifest?.url).toBeUndefined()
  })
  it("rejects mixed renderers, unknown UIs and invalid presentation options", () => {
    expect(() => parseWidgetCatalog([{ ...widget, url: `${SERVER_URL}/widgets/feed/index.html` }], SERVER_URL)).toThrow("must not declare")
    expect(() => parseWidgetCatalog([{ ...widget, view: { type: "unknown" } }], SERVER_URL)).toThrow("Invalid Widget UI")
    expect(() => parseWidgetCatalog([{ ...widget, view: { type: "live-card", query: "items", presentation: "invalid" } }], SERVER_URL)).toThrow("Invalid Widget UI")
  })
})

describe("chart Widget manifests", () => {
  const base = { id: "chart", title: "Chart", height: 2, minHeight: 1, width: 2, minWidth: 1 }
  it("parses chart mappings and rejects unknown or out-of-range configuration", () => {
    const view = { type: "chart", chart: "line", query: "stats", label: "day", value: "count", limit: 30 }
    expect(parseWidgetCatalog([{ ...base, view }], SERVER_URL)[0]?.view).toEqual(view)
    for (const patch of [{ chart: "unknown" }, { limit: 0 }, { decimals: 7 }, { target: 0 }, { value: "" }, { unknown: true }]) {
      expect(() => parseWidgetCatalog([{ ...base, view: { ...view, ...patch } }], SERVER_URL)).toThrow()
    }
  })
})
