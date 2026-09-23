import type { WidgetChartView } from "@newsnext/sdk/models"
import { describe, expect, it } from "vitest"
import { parseChartRows } from "./widget-chart-data"

const view: WidgetChartView = { type: "chart", chart: "word-cloud", query: "observations" }

describe("word cloud rows", () => {
  it("maps labels and values, sorts, and limits the result", () => {
    expect(parseChartRows({ rows: [{ name: "AI", count: 3 }, { name: "News", count: 8 }] }, { ...view, label: "name", value: "count", sort: "desc", limit: 1 })).toEqual([{ label: "News", value: 8 }])
  })

  it("rejects invalid values and excessive input", () => {
    expect(() => parseChartRows({ rows: [{ label: "Loss", value: -1 }] }, view)).toThrow("non-negative")
    expect(() => parseChartRows({ rows: [{ label: "AI", value: "many" }] }, view)).toThrow("finite numeric value")
    expect(() => parseChartRows({ rows: Array.from({ length: 10_001 }, () => ({ label: "AI", value: 1 })) }, view)).toThrow("10,000")
  })
})
