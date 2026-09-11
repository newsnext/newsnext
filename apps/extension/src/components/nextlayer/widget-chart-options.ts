import type { WidgetChartView } from "@newsnext/sdk/models"
import type { EChartsOption, SeriesOption } from "echarts"
import type { ChartRow } from "./widget-chart-data"
import { histogramRows } from "./widget-chart-data"

export interface ChartTheme { colors: string[], foreground: string, muted: string, divider: string, fontFamily: string }

export function formatChartValue(value: number, view: WidgetChartView): string {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: view.decimals ?? 1 })}${view.suffix ?? ""}`
}

/** Maps already validated observations to presentation. No fetching or data mutation. */
export function createChartOption(input: ChartRow[], view: WidgetChartView, theme: ChartTheme): EChartsOption {
  const rows = view.chart === "histogram" ? histogramRows(input, view.bins ?? 10) : input
  const format = (value: number): string => view.chart === "histogram" ? String(value) : formatChartValue(value, view)
  const labels = [...new Set(rows.map(row => row.label))]
  const series = [...new Set(rows.map(row => row.series))]
  const horizontal = view.chart === "ranking" || view.chart === "progress"
  const base: EChartsOption = {
    color: theme.colors,
    backgroundColor: "transparent",
    animation: false,
    textStyle: { fontFamily: theme.fontFamily, color: theme.foreground },
    aria: { enabled: true },
    tooltip: { trigger: "item", renderMode: "richText", confine: true, textStyle: { fontSize: 12 }, valueFormatter: value => typeof value === "number" ? format(value) : String(value) },
  }
  if (view.chart === "donut") return { ...base, series: [{ type: "pie", radius: ["40%", "64%"], avoidLabelOverlap: true, label: { color: theme.muted, fontSize: 11, overflow: "truncate", width: 60, alignTo: "edge", edgeDistance: 6 }, labelLine: { length: 8, length2: 6 }, emphasis: { scale: false }, data: rows.map(row => ({ name: row.label, value: row.value })) }] }
  if (view.chart === "funnel") return { ...base, series: [{ type: "funnel", top: 12, bottom: 12, left: "12%", width: "76%", gap: 3, sort: "none", label: { position: "inside", color: "#fff", fontSize: 11, formatter: "{b}: {c}" }, data: rows.map(row => ({ name: row.label, value: row.value })) }] }
  if (view.chart === "radar") return { ...base, radar: { radius: "64%", indicator: rows.map(row => ({ name: row.label, max: Math.max(...rows.map(row => row.value), 1) })), axisName: { color: theme.muted, fontSize: 11, overflow: "truncate", width: 75 }, splitArea: { show: false }, splitLine: { lineStyle: { color: theme.divider } }, axisLine: { lineStyle: { color: theme.divider } } }, series: [{ type: "radar", symbolSize: 4, areaStyle: { opacity: 0.14 }, data: [{ value: rows.map(row => row.value) }] }] }
  if (view.chart === "heatmap") {
    const xs = [...new Set(rows.map(row => String(row.x)))]
    const ys = [...new Set(rows.map(row => String(row.y)))]
    return { ...base, grid: { top: 8, left: 8, right: 8, bottom: 8, containLabel: true }, xAxis: { type: "category", data: xs, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: theme.muted } }, yAxis: { type: "category", data: ys, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: theme.muted } }, visualMap: { show: false, min: Math.min(...rows.map(row => row.value)), max: Math.max(...rows.map(row => row.value), 1), inRange: { color: [theme.colors[2]!, theme.colors[0]!, theme.colors[1]!] } }, series: [{ type: "heatmap", itemStyle: { borderWidth: 2, borderColor: "transparent", borderRadius: 3 }, data: rows.map(row => [xs.indexOf(String(row.x)), ys.indexOf(String(row.y)), row.value]) }] }
  }
  const categoryAxis = { type: "category" as const, data: labels, inverse: horizontal, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: theme.muted, fontSize: 10, hideOverlap: true, width: 85, overflow: "truncate" as const } }
  const valueAxis = { type: "value" as const, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: theme.muted, fontSize: 10, formatter: format }, splitLine: { lineStyle: { color: theme.divider } } }
  const chartSeries: SeriesOption[] = series.map((name) => {
    const group = rows.filter(row => row.series === name)
    if (view.chart === "scatter") return { type: "scatter", name, symbolSize: 8, data: group.map(row => ({ name: row.label, value: [Number(row.x), Number(row.y)] })) }
    // Missing series observations remain gaps instead of fabricated zero values.
    const data = labels.map(label => group.find(row => row.label === label)?.value ?? null)
    if (view.chart === "line" || view.chart === "area") return { type: "line", name, data, showSymbol: rows.length < 60, symbolSize: 5, lineStyle: { width: 2 }, areaStyle: view.chart === "area" ? { opacity: 0.13 } : undefined, connectNulls: false }
    return { type: "bar", name, data, stack: view.chart === "stacked-bar" ? "total" : undefined, barMaxWidth: horizontal ? 18 : 40, itemStyle: { borderRadius: 3 }, showBackground: view.chart === "progress", backgroundStyle: { color: theme.divider }, label: { show: horizontal, position: "right", color: theme.muted, fontSize: 11, formatter: params => typeof params.value === "number" ? format(params.value) : "" } }
  })
  return { ...base, grid: { top: series.some(Boolean) ? 30 : 12, bottom: 8, left: 8, right: horizontal ? 65 : 12, containLabel: true }, legend: { show: series.some(Boolean), top: 0, type: "scroll", selectedMode: false, textStyle: { color: theme.muted, fontSize: 10 }, itemWidth: 10, itemHeight: 6 }, xAxis: view.chart === "scatter" ? { ...valueAxis, axisLabel: { color: theme.muted, fontSize: 10 } } : horizontal ? { ...valueAxis, max: view.chart === "progress" ? Math.max(view.target ?? 100, ...rows.map(row => row.value)) : undefined } : categoryAxis, yAxis: horizontal ? categoryAxis : valueAxis, series: chartSeries }
}
