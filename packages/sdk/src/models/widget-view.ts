export const WIDGET_CHARTS = ["word-cloud"] as const
export type WidgetChart = typeof WIDGET_CHARTS[number]

/** Presentation only. Data producers return named results independently of this configuration. */
export interface WidgetChartOptions {
  chart: WidgetChart
  /** Literal row field names, not expressions; `label`/`value` keep their view mapping. */
  label?: string
  value?: string
  /** Row cap 1–500, default 100; sorting applies before the limit. */
  limit?: number
  sort?: "none" | "asc" | "desc"
}

/** Built-in chart view. Rows are `{ label, value }`; malformed rows error visibly. */
export interface WidgetChartView extends WidgetChartOptions {
  type: "chart"
  /** Names the `data.mjs` result consumed by this view. */
  query: string
}

export function parseWidgetChartOptions(value: unknown): Partial<WidgetChartOptions> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid Widget chart options")
  const result: Partial<WidgetChartOptions> = {}
  for (const [key, entry] of Object.entries(value)) {
    switch (key) {
      case "chart":
        if (entry !== "word-cloud") throw new Error("Invalid Widget chart")
        result.chart = entry
        break
      case "label": case "value":
        if (typeof entry !== "string" || entry.length > 100 || !entry.trim()) throw new Error(`Invalid Widget ${key}`)
        result[key] = entry
        break
      case "limit":
        if (typeof entry !== "number" || !Number.isInteger(entry) || entry < 1 || entry > 500) throw new Error(`Invalid Widget ${key}`)
        result[key] = entry
        break
      case "sort":
        if (entry !== "none" && entry !== "asc" && entry !== "desc") throw new Error("Invalid Widget sort")
        result.sort = entry
        break
      default: throw new Error(`Unknown Widget chart option: ${key}`)
    }
  }
  return result
}

export function parseWidgetChartView(value: Record<string, unknown>): WidgetChartView {
  const { type, query, ...options } = value
  if (type !== "chart" || typeof query !== "string" || !/^[\w-]+$/.test(query)) throw new Error("Invalid Widget chart query")
  const parsed = parseWidgetChartOptions(options)
  if (!parsed.chart) throw new Error("Widget chart is required")
  return { ...parsed, chart: parsed.chart, type, query }
}
