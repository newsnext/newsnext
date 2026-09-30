import { describe, expect, it } from "vitest"
import { parseInsightCatalog } from "./insight-manifest"

const SERVER_URL = "http://127.0.0.1:43121"
describe("parseInsightCatalog", () => {
  it("accepts shared parameter definitions and rejects invalid defaults", () => {
    const insight = {
      id: "feed",
      title: "Feed",
      height: 4,
      minHeight: 1,
      width: 6,
      minWidth: 1,
      view: { preset: "live-card", query: "feed" },
      params: { limit: { type: "number", title: "Limit", default: 10, min: 1, max: 20 } },
      dataFiles: [],
      dataRevision: "rev",
      hasData: true,
      viewRevision: "rev",
    }
    expect(parseInsightCatalog([insight], SERVER_URL)[0]?.params).toEqual(insight.params)
    expect(parseInsightCatalog([insight], SERVER_URL)[0]?.minWidth).toBe(2)
    expect(parseInsightCatalog([{ ...insight, width: 1 }], SERVER_URL)[0]?.width).toBe(2)
    expect(() => parseInsightCatalog([{
      ...insight,
      params: { limit: { ...insight.params.limit, default: 30 } },
    }], SERVER_URL)).toThrow("default is invalid")
  })

  it("accepts insights served by the declared loopback origin", () => {
    const [manifest] = parseInsightCatalog([{
      height: 4,
      id: "headlines",
      minHeight: 2,
      minWidth: 2,
      title: "Headlines",
      url: `${SERVER_URL}/insights/headlines/index.html`,
      width: 6,
      dataFiles: [],
      dataRevision: "rev",
      hasData: true,
      viewRevision: "rev",
    }], SERVER_URL)
    expect(manifest?.view).toBeUndefined()
  })

  it("resolves an omitted palette and rejects unsupported colors", () => {
    const insight = {
      height: 4,
      id: "headlines",
      minHeight: 2,
      minWidth: 2,
      title: "Headlines",
      url: `${SERVER_URL}/insights/headlines/index.html`,
      width: 6,
      dataFiles: [],
      dataRevision: "rev",
      hasData: true,
      viewRevision: "rev",
    }
    expect(parseInsightCatalog([insight], SERVER_URL)[0]?.color).toBe("slate")
    expect(parseInsightCatalog([{ ...insight, color: "teal" }], SERVER_URL)[0]?.color).toBe("teal")
    expect(() => parseInsightCatalog([{ ...insight, color: "invalid" }], SERVER_URL)).toThrow("invalid Insight manifest")
  })

  it("rejects entry URLs from another origin", () => {
    expect(() => parseInsightCatalog([{
      height: 4,
      id: "headlines",
      minHeight: 2,
      minWidth: 2,
      title: "Headlines",
      url: "https://example.com/insights/headlines/index.html",
      width: 6,
      dataFiles: [],
      dataRevision: "rev",
      hasData: true,
      viewRevision: "rev",
    }], SERVER_URL)).toThrow("invalid entry URL")
  })

  it("rejects duplicate insight IDs", () => {
    const insight = {
      height: 4,
      id: "headlines",
      minHeight: 2,
      minWidth: 2,
      title: "Headlines",
      url: `${SERVER_URL}/insights/headlines/index.html`,
      width: 6,
      dataFiles: [],
      dataRevision: "rev",
      hasData: true,
      viewRevision: "rev",
    }
    expect(() => parseInsightCatalog([insight, insight], SERVER_URL)).toThrow("Duplicate insight ID")
  })

  it("parses the data flag and rejects invalid or missing data fields", () => {
    const insight = {
      height: 2,
      id: "plain",
      minHeight: 1,
      minWidth: 1,
      title: "Plain",
      url: `${SERVER_URL}/insights/plain/index.html`,
      width: 2,
      dataFiles: [],
      dataRevision: "rev",
      hasData: true,
      viewRevision: "rev",
    }
    expect(parseInsightCatalog([insight], SERVER_URL)[0]?.hasData).toBe(true)
    expect(parseInsightCatalog([{ ...insight, hasData: false }], SERVER_URL)[0]?.hasData).toBe(false)
    expect(() => parseInsightCatalog([{ ...insight, hasData: "yes" }], SERVER_URL)).toThrow("Invalid Insight data flag")
    const { hasData: _hasData, ...missingFlag } = insight
    expect(() => parseInsightCatalog([missingFlag], SERVER_URL)).toThrow("Invalid Insight data flag")
    const { viewRevision: _viewRevision, ...missingRevision } = insight
    expect(() => parseInsightCatalog([missingRevision], SERVER_URL)).toThrow("Invalid Insight view revision")
  })
})

describe("built-in Insight UI", () => {
  const insight = { id: "feed", title: "Feed", height: 4, minHeight: 2, width: 4, minWidth: 2, view: { preset: "live-card", query: "items" }, dataFiles: [], dataRevision: "rev", hasData: true, viewRevision: "rev" }
  it("accepts a data-only Insight without an HTML entry", () => {
    const [manifest] = parseInsightCatalog([insight], SERVER_URL)
    expect(manifest?.view).toEqual({ preset: "live-card", query: "items" })
    expect(manifest?.url).toBeUndefined()
  })
  it("rejects mixed renderers, unknown UIs and invalid presentation options", () => {
    expect(() => parseInsightCatalog([{ ...insight, url: `${SERVER_URL}/insights/feed/index.html` }], SERVER_URL)).toThrow("must not declare")
    expect(() => parseInsightCatalog([{ ...insight, view: { preset: "unknown" } }], SERVER_URL)).toThrow("Invalid Insight UI")
    expect(() => parseInsightCatalog([{ ...insight, view: { preset: "live-card", query: "items", presentation: "invalid" } }], SERVER_URL)).toThrow("Invalid Insight UI")
  })
})

describe("chart Insight manifests", () => {
  const base = { id: "chart", title: "Chart", height: 2, minHeight: 1, width: 2, minWidth: 1, dataFiles: [], dataRevision: "rev", hasData: true, viewRevision: "rev" }
  it("parses chart mappings and rejects unknown or out-of-range configuration", () => {
    const view = { preset: "word-cloud", query: "stats", label: "day", value: "count", limit: 30 }
    expect(parseInsightCatalog([{ ...base, view }], SERVER_URL)[0]?.view).toEqual(view)
    for (const patch of [{ preset: "unknown" }, { limit: 0 }, { value: "" }, { unknown: true }]) {
      expect(() => parseInsightCatalog([{ ...base, view: { ...view, ...patch } }], SERVER_URL)).toThrow()
    }
  })
})
