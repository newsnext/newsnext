import { describe, expect, it } from "vitest"
import { parseLocalWidgetManifests } from "./widget-manifest"

const SERVER_URL = "http://127.0.0.1:43121"
describe("parseLocalWidgetManifests", () => {
  it("accepts widgets served by the declared loopback origin", () => {
    expect(parseLocalWidgetManifests([{
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
    expect(parseLocalWidgetManifests([widget], SERVER_URL)[0]?.color).toBe("slate")
    expect(parseLocalWidgetManifests([{ ...widget, color: "teal" }], SERVER_URL)[0]?.color).toBe("teal")
    expect(() => parseLocalWidgetManifests([{ ...widget, color: "invalid" }], SERVER_URL)).toThrow("invalid widget manifest")
  })

  it("rejects entry URLs from another origin", () => {
    expect(() => parseLocalWidgetManifests([{
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
    expect(() => parseLocalWidgetManifests([widget, widget], SERVER_URL)).toThrow("Duplicate widget ID")
  })
})

describe("built-in Widget UI", () => {
  const widget = { id: "feed", title: "Feed", height: 4, minHeight: 2, width: 4, minWidth: 2, view: { type: "live-card", query: "items" } }
  it("accepts a data-only Widget without an HTML entry", () => {
    const [manifest] = parseLocalWidgetManifests([widget], SERVER_URL)
    expect(manifest?.view).toEqual({ type: "live-card", query: "items" })
    expect(manifest?.url).toBeUndefined()
  })
  it("rejects mixed renderers, unknown UIs and invalid presentation options", () => {
    expect(() => parseLocalWidgetManifests([{ ...widget, url: `${SERVER_URL}/widgets/feed/index.html` }], SERVER_URL)).toThrow("must not declare")
    expect(() => parseLocalWidgetManifests([{ ...widget, view: { type: "unknown" } }], SERVER_URL)).toThrow("Invalid Widget UI")
    expect(() => parseLocalWidgetManifests([{ ...widget, view: { type: "live-card", query: "items", presentation: "invalid" } }], SERVER_URL)).toThrow("Invalid Widget UI")
  })
})
