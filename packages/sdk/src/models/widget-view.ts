export const WIDGET_CHARTS = ["metric", "line", "area", "bar", "ranking", "stacked-bar", "donut", "scatter", "heatmap", "histogram", "radar", "funnel", "table", "word-cloud", "progress", "trend-metric", "change-ranking", "calendar", "status", "timeline", "treemap", "bullet", "boxplot", "waterfall", "sankey"] as const
export type WidgetChart = typeof WIDGET_CHARTS[number]

/** Presentation only. Data producers return named results independently of this configuration. */
export interface WidgetChartOptions {
  chart: WidgetChart
  label?: string
  value?: string
  series?: string
  x?: string
  y?: string
  limit?: number
  sort?: "none" | "asc" | "desc"
  decimals?: number
  suffix?: string
  target?: number
  bins?: number
}

export interface WidgetChartView extends WidgetChartOptions {
  type: "chart"
  query: string
}

export function parseWidgetChartOptions(value: unknown, partial = false): Partial<WidgetChartOptions> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid Widget chart options")
  const result: Partial<WidgetChartOptions> = {}
  for (const [key, entry] of Object.entries(value)) {
    switch (key) {
      case "chart":
        if (!WIDGET_CHARTS.includes(entry)) throw new Error("Invalid Widget chart")
        result.chart = entry as WidgetChart
        break
      case "label": case "value": case "series": case "x": case "y": case "suffix":
        if (typeof entry !== "string" || entry.length > 100 || (key !== "suffix" && key !== "series" && !entry.trim())) throw new Error(`Invalid Widget ${key}`)
        result[key] = entry
        break
      case "limit": case "decimals": case "bins":
        if (typeof entry !== "number" || !Number.isInteger(entry) || entry < (key === "decimals" ? 0 : 1) || entry > (key === "decimals" ? 6 : key === "bins" ? 50 : 500)) throw new Error(`Invalid Widget ${key}`)
        result[key] = entry
        break
      case "target":
        if (typeof entry !== "number" || !Number.isFinite(entry) || entry <= 0) throw new Error("Invalid Widget target")
        result.target = entry
        break
      case "sort":
        if (entry !== "none" && entry !== "asc" && entry !== "desc") throw new Error("Invalid Widget sort")
        result.sort = entry
        break
      default: throw new Error(`Unknown Widget chart option: ${key}`)
    }
  }
  if (!partial && !result.chart) throw new Error("Widget chart is required")
  return result
}

export function parseWidgetChartView(value: Record<string, unknown>): WidgetChartView {
  const { type, query, ...options } = value
  if (type !== "chart" || typeof query !== "string" || !/^[\w-]+$/.test(query)) throw new Error("Invalid Widget chart query")
  const parsed = parseWidgetChartOptions(options)
  if (!parsed.chart) throw new Error("Widget chart is required")
  return { ...parsed, chart: parsed.chart, type, query }
}
