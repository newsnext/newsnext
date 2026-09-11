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
