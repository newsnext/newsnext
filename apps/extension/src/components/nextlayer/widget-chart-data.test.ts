import type { WidgetChartView } from "@newsnext/sdk/models"
import { describe, expect, it } from "vitest"
import { histogramRows, parseChartRows } from "./widget-chart-data"
import { createChartOption } from "./widget-chart-options"

const view: WidgetChartView = { type: "chart", chart: "bar", query: "observations" }

describe("widget chart observations", () => {
  it("maps fields, sorts without changing producer data, and limits output", () => {
    const input = { rows: [{ name: "A", count: -5 }, { name: "B", count: 0 }, { name: "C", count: 10 }] }
    expect(parseChartRows(input, { ...view, label: "name", value: "count", sort: "desc", limit: 2 }).map(row => row.value)).toEqual([10, 0])
    expect(input.rows[0]?.count).toBe(-5)
  })
  it("distinguishes empty data, malformed observations and unsupported signed values", () => {
    expect(parseChartRows({ rows: [] }, view)).toEqual([])
    for (const data of [undefined, {}, { rows: [null] }, { rows: [{ label: "A", value: "5" }] }, { rows: [{ label: "A", value: Infinity }] }]) expect(() => parseChartRows(data, view)).toThrow()
    expect(() => parseChartRows({ rows: [{ label: "Loss", value: -1 }] }, { ...view, chart: "donut" })).toThrow("non-negative")
    expect(() => parseChartRows({ rows: [{ label: "A", value: 2, x: "bad" }] }, { ...view, chart: "scatter" })).toThrow("numeric x")
  })
  it("keeps histogram boundary observations and constant datasets", () => {
    const rows = parseChartRows({ rows: [0, 1, 2, 3, 4].map(value => ({ label: String(value), value })) }, view)
    expect(histogramRows(rows, 2).map(row => row.value)).toEqual([2, 3])
    expect(histogramRows(rows.map(row => ({ ...row, value: 2 })), 3).map(row => row.value)).toEqual([0, 5, 0])
    expect(histogramRows([], 4)).toEqual([])
  })
  it("preserves gaps between series observations in chart options", () => {
    const rows = parseChartRows({ rows: [{ label: "Mon", value: 3, series: "A" }, { label: "Tue", value: 5, series: "B" }] }, { ...view, series: "series" })
    const option = createChartOption(rows, { ...view, chart: "line" }, { colors: ["#08a"], foreground: "#111", muted: "#666", divider: "#eee", fontFamily: "sans-serif" })
    expect(option.series).toMatchObject([{ name: "A", data: [3, null] }, { name: "B", data: [null, 5] }])
  })
})

describe("advanced widget observations", () => {
  const parse = (chart: WidgetChartView["chart"], rows: unknown[]) => parseChartRows({ rows }, { ...view, chart, limit: 500 })
  it("validates real calendar dates and bounded ranges", () => {
    expect(parse("calendar", [{ label: "2024-02-29", value: 1 }])).toHaveLength(1)
    expect(() => parse("calendar", [{ label: "2026-02-29", value: 1 }])).toThrow("dates")
    expect(() => parse("calendar", [{ label: "2024-01-01", value: 1 }, { label: "2026-01-01", value: 2 }])).toThrow("range")
  })
  it("accepts text-only events and requires timezone-aware timestamps", () => {
    expect(parse("status", [{ label: "Feed", status: "ok", timestamp: "2026-09-11T00:00:00Z" }])[0]?.status).toBe("ok")
    expect(() => parse("timeline", [{ label: "Event", timestamp: "2026-09-11T00:00:00" }])).toThrow("timezone")
    expect(() => parse("status", [{ label: "Feed", status: "green", timestamp: "2026-09-11T00:00:00Z" }])).toThrow("status")
  })
  it("requires ordered box summaries and finite outliers", () => {
    expect(parse("boxplot", [{ label: "A", value: 3, box: [1, 2, 3, 4, 5], outliers: [9] }])[0]?.outliers).toEqual([9])
    expect(() => parse("boxplot", [{ label: "A", value: 3, box: [1, 3, 2, 4, 5] }])).toThrow("ordered")
    expect(() => parse("boxplot", [{ label: "A", value: 3, box: [1, 2, 3, 4, 5], outliers: [NaN] }])).toThrow("outliers")
  })
  it("rejects cyclic flows before rendering", () => {
    expect(parse("sankey", [{ label: "A", destination: "B", value: 2 }, { label: "B", destination: "C", value: 1 }])).toHaveLength(2)
    expect(() => parse("sankey", [{ label: "A", destination: "B", value: 2 }, { label: "B", destination: "A", value: 1 }])).toThrow("cycles")
  })
  it("keeps comparisons and bullet targets distinct from current values", () => {
    expect(parse("change-ranking", [{ label: "A", value: 3, previous: 0, previousRank: 2 }])[0]?.previous).toBe(0)
    expect(() => parse("trend-metric", [{ label: "A", value: 3, previous: 2, history: [] }])).toThrow("history")
    expect(parse("bullet", [{ label: "A", value: 3, target: 5, range: [0, 10] }])[0]?.target).toBe(5)
    expect(() => parse("bullet", [{ label: "A", value: 3, range: [5, 2] }])).toThrow("ordered")
  })
  it("represents waterfall intervals across zero", () => {
    const rows = parse("waterfall", [{ label: "Start", value: 5 }, { label: "Loss", value: -8 }, { label: "Gain", value: 6 }])
    const option = createChartOption(rows, { ...view, chart: "waterfall" }, { colors: ["#08a", "#048"], foreground: "#111", muted: "#666", divider: "#eee", fontFamily: "sans-serif" })
    expect(option.series).toMatchObject([{ data: [[0, 0, 5, 5], [1, 5, -3, -8], [2, -3, 3, 6]] }])
  })
})
