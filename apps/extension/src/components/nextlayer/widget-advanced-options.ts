import type { WidgetChartView } from "@newsnext/sdk/models"
import type { EChartsOption } from "echarts"
import type { ChartRow } from "./widget-chart-data"
import type { ChartTheme } from "./widget-chart-options"

export function advancedChartOption(rows: ChartRow[], view: WidgetChartView, theme: ChartTheme, format: (value: number) => string): EChartsOption | undefined {
  if (view.chart === "treemap") return { series: [{ type: "treemap", roam: false, nodeClick: false, breadcrumb: { show: false }, top: 4, bottom: 4, left: 4, right: 4, label: { formatter: params => `${params.name}\n${typeof params.value === "number" ? format(params.value) : ""}`, color: "#fff" }, data: rows.map(row => ({ name: row.label, value: row.value })) }] }
  if (view.chart === "sankey") return { aria: { enabled: true, label: { description: `Sankey flows. ${rows.slice(0, 10).map(row => `${row.label} to ${row.destination}: ${row.value}`).join(". ")}` } }, series: [{ type: "sankey", left: 4, right: 75, top: 8, bottom: 8, draggable: false, emphasis: { focus: "adjacency" }, label: { color: theme.foreground, fontSize: 10, width: 70, overflow: "truncate" }, lineStyle: { color: "source", opacity: 0.25 }, data: [...new Set(rows.flatMap(row => [row.label, row.destination!]))].map(name => ({ name })), links: rows.map(row => ({ source: row.label, target: row.destination!, value: row.value })) }] }
  if (view.chart === "calendar") {
    const dates = rows.map(row => row.label).sort()
    return {
      calendar: { range: [dates[0]!, dates.at(-1)!], top: 30, bottom: 10, left: 30, right: 10, cellSize: ["auto", "auto"], yearLabel: { show: false }, monthLabel: { color: theme.muted, fontSize: 10 }, dayLabel: { firstDay: 1, color: theme.muted, fontSize: 9 }, splitLine: { show: false }, itemStyle: { color: "transparent", borderColor: theme.divider, borderWidth: 1 } },
      visualMap: { show: false, min: 0, max: Math.max(1, ...rows.map(row => row.value)), inRange: { color: [theme.colors[2]!, theme.colors[0]!, theme.colors[1]!] } },
      series: [{ type: "heatmap", coordinateSystem: "calendar", data: rows.map(row => [row.label, row.value]) }],
    }
  }
  const labels = rows.map(row => row.label)
  const category = { type: "category" as const, data: labels, axisLabel: { color: theme.muted, fontSize: 10, width: 65, overflow: "truncate" as const }, axisTick: { show: false }, axisLine: { show: false } }
  const value = { type: "value" as const, axisLabel: { color: theme.muted, fontSize: 10, formatter: format }, splitLine: { lineStyle: { color: theme.divider } } }
  const grid = { top: 12, left: 8, right: 12, bottom: 8, containLabel: true }
  if (view.chart === "boxplot") return { grid, xAxis: category, yAxis: value, series: [{ type: "boxplot", data: rows.map(row => row.box!), itemStyle: { color: theme.colors[2], borderColor: theme.colors[0] } }, { type: "scatter", name: "Outliers", symbolSize: 5, data: rows.flatMap((row, i) => (row.outliers ?? []).map(value => [i, value])) }] }
  if (view.chart === "bullet") {
    return {
      grid,
      xAxis: value,
      yAxis: { ...category, inverse: true },
      series: [
        { type: "bar", stack: "range", silent: true, barWidth: 22, itemStyle: { color: "transparent" }, data: rows.map(row => row.range?.[0] ?? 0), tooltip: { show: false } },
        { type: "bar", stack: "range", silent: true, barWidth: 22, itemStyle: { color: theme.divider }, data: rows.map(row => row.range ? row.range[1] - row.range[0] : Math.max(row.value, row.target!, 0)), tooltip: { show: false } },
        { type: "bar", name: "Actual", barWidth: 8, barGap: "-68%", data: rows.map(row => row.value) },
        { type: "scatter", name: "Target", symbol: "rect", symbolSize: [3, 24], itemStyle: { color: theme.foreground }, data: rows.map((row, index) => [row.target!, index]) },
      ],
    }
  }
  if (view.chart === "waterfall") {
    let total = 0
    const spans = rows.map((row) => {
      const start = total
      total += row.value
      return { start, end: total }
    })
    // Custom rectangular intervals support contributions that cross zero.
    return { grid, xAxis: category, yAxis: value, series: [{ type: "custom", encode: { x: 0, y: [1, 2], tooltip: 3 }, data: rows.map((row, i) => [i, spans[i]!.start, spans[i]!.end, row.value]), renderItem: (_params, api) => {
      const start = api.coord([api.value(0), api.value(1)])
      const end = api.coord([api.value(0), api.value(2)])
      const size = api.size?.([1, 0])
      const width = Math.min(40, Array.isArray(size) ? Number(size[0]) * 0.6 : 20)
      return { type: "rect", shape: { x: start[0]! - width / 2, y: Math.min(start[1]!, end[1]!), width, height: Math.max(1, Math.abs(start[1]! - end[1]!)) }, style: { fill: Number(api.value(3)) < 0 ? theme.colors[2] : theme.colors[0], opacity: Number(api.value(3)) < 0 ? 0.75 : 1 } }
    } }] }
  }
  return undefined
}
