import type { WidgetChartView } from "@newsnext/sdk/models"

export interface ChartRow {
  label: string
  value: number
  series: string
  x: number | string
  y: number | string
}

function scalar(value: unknown): value is string | number {
  return typeof value === "string" || (typeof value === "number" && Number.isFinite(value))
}

/** Invalid observations are surfaced, never silently converted to zero. */
export function parseChartRows(input: unknown, view: WidgetChartView): ChartRow[] {
  if (!input || typeof input !== "object" || !("rows" in input) || !Array.isArray(input.rows)) throw new Error("Expected a query result with a rows array.")
  if (input.rows.length > 10_000) throw new Error("Chart data exceeds 10,000 rows.")
  const rows = input.rows.map((row: unknown, index): ChartRow => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error(`Row ${index + 1} must be an object.`)
    const record = row as Record<string, unknown>
    const value = record[view.value ?? "value"]
    const label = record[view.label ?? "label"]
    const series = view.series ? record[view.series] : ""
    const x = record[view.x ?? "x"] ?? label
    const y = record[view.y ?? "y"] ?? value
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Row ${index + 1} needs a finite numeric value.`)
    if (!scalar(label)) throw new Error(`Row ${index + 1} needs a label.`)
    if (!scalar(series)) throw new Error(`Row ${index + 1} needs a series.`)
    if (view.chart === "scatter" && (typeof x !== "number" || !Number.isFinite(x) || typeof y !== "number" || !Number.isFinite(y))) throw new Error(`Row ${index + 1} needs numeric x and y coordinates.`)
    if (!scalar(x) || !scalar(y)) throw new Error(`Row ${index + 1} has invalid coordinates.`)
    if (["donut", "stacked-bar", "funnel", "radar", "word-cloud", "progress"].includes(view.chart) && value < 0) throw new Error("This view requires non-negative values.")
    return { label: String(label), value, series: String(series), x, y }
  })
  if (view.sort && view.sort !== "none") rows.sort((a, b) => view.sort === "asc" ? a.value - b.value : b.value - a.value)
  const visible = rows.slice(0, view.limit ?? 100)
  if (["line", "area", "bar", "ranking", "stacked-bar", "radar", "progress"].includes(view.chart)) {
    const seen = new Set<string>()
    for (const row of visible) {
      const key = JSON.stringify([row.label, row.series])
      if (seen.has(key)) throw new Error("Aggregate repeated labels within each series in the data producer.")
      seen.add(key)
    }
  }
  if (view.chart === "radar" && visible.length > 0 && visible.length < 3) throw new Error("Radar needs at least three values.")
  return visible
}

export function histogramRows(rows: ChartRow[], bins = 10): ChartRow[] {
  if (!rows.length) return []
  const values = rows.map(row => row.value)
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) {
    min -= 0.5
    max += 0.5
  }
  const step = (max - min) / bins
  const counts = Array.from<number>({ length: bins }).fill(0)
  for (const row of rows) counts[Math.min(bins - 1, Math.floor((row.value - min) / step))]!++
  return counts.map((value, i) => ({ label: `${Number((min + i * step).toPrecision(4))}–${Number((min + (i + 1) * step).toPrecision(4))}`, value, series: "", x: i, y: value }))
}
