import type { WidgetChartView } from "@newsnext/sdk/models"
import { periodChange } from "@newsnext/sdk/analytics"

export interface ChartRow {
  label: string
  value: number
  series: string
  x: number | string
  y: number | string
  previous?: number
  previousRank?: number
  history?: number[]
  status?: "ok" | "warning" | "error" | "unknown"
  detail?: string
  timestamp?: string
  target?: number
  range?: [number, number]
  box?: [number, number, number, number, number]
  outliers?: number[]
  destination?: string
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
    const value = ["status", "timeline"].includes(view.chart) ? 0 : record[view.value ?? "value"]
    const label = record[view.label ?? "label"]
    const series = view.series ? record[view.series] : ""
    const x = record[view.x ?? "x"] ?? label
    const y = record[view.y ?? "y"] ?? value
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Row ${index + 1} needs a finite numeric value.`)
    if (!scalar(label)) throw new Error(`Row ${index + 1} needs a label.`)
    if (!scalar(series)) throw new Error(`Row ${index + 1} needs a series.`)
    if (view.chart === "scatter" && (typeof x !== "number" || !Number.isFinite(x) || typeof y !== "number" || !Number.isFinite(y))) throw new Error(`Row ${index + 1} needs numeric x and y coordinates.`)
    if (!scalar(x) || !scalar(y)) throw new Error(`Row ${index + 1} has invalid coordinates.`)
    if (["donut", "stacked-bar", "funnel", "radar", "word-cloud", "progress", "treemap", "sankey", "calendar"].includes(view.chart) && value < 0) throw new Error("This view requires non-negative values.")
    const parsed: ChartRow = { label: String(label), value, series: String(series), x, y }
    const number = (key: string): number => {
      const entry = record[key]
      if (typeof entry !== "number" || !Number.isFinite(entry)) throw new Error(`Row ${index + 1} needs a finite ${key}.`)
      return entry
    }
    const text = (key: string): string => {
      const entry = record[key]
      if (typeof entry !== "string" || !entry.trim()) throw new Error(`Row ${index + 1} needs ${key}.`)
      return entry
    }
    const numbers = (key: string, length?: number): number[] => {
      const entry = record[key]
      if (!Array.isArray(entry) || !entry.length || entry.length > 500 || (length !== undefined && entry.length !== length) || !entry.every(v => typeof v === "number" && Number.isFinite(v))) throw new Error(`Row ${index + 1} has invalid ${key}.`)
      return entry as number[]
    }
    if (["trend-metric", "change-ranking"].includes(view.chart)) {
      parsed.previous = number("previous")
      periodChange(value, parsed.previous)
    }
    if (view.chart === "trend-metric") parsed.history = numbers("history")
    if (view.chart === "change-ranking" && record.previousRank !== undefined) {
      parsed.previousRank = number("previousRank")
      if (!Number.isInteger(parsed.previousRank) || parsed.previousRank < 1) throw new Error("Previous rank must be a positive integer.")
    }
    if (["status", "timeline"].includes(view.chart)) {
      parsed.timestamp = text("timestamp")
      if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(parsed.timestamp) || !Number.isFinite(Date.parse(parsed.timestamp))) throw new Error("Timestamp must include a timezone.")
      if (record.detail !== undefined) parsed.detail = text("detail")
    }
    if (view.chart === "status") {
      const status = text("status")
      if (status !== "ok" && status !== "warning" && status !== "error" && status !== "unknown") throw new Error("Invalid status.")
      parsed.status = status
    }
    if (view.chart === "calendar" && (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.label) || !Number.isFinite(Date.parse(parsed.label)) || new Date(parsed.label).toISOString().slice(0, 10) !== parsed.label)) throw new Error("Calendar labels must be valid YYYY-MM-DD dates.")
    if (view.chart === "bullet") {
      parsed.target = record.target === undefined ? view.target ?? 100 : number("target")
      if (value < 0 || parsed.target < 0) throw new Error("Bullet values and targets must be non-negative.")
      if (record.range !== undefined) {
        const range = numbers("range", 2)
        if (range[0]! < 0 || range[0]! > range[1]!) throw new Error("Reference range must be ordered.")
        parsed.range = [range[0]!, range[1]!]
      }
    }
    if (view.chart === "boxplot") {
      const box = numbers("box", 5)
      if (box.some((v, i) => i > 0 && v < box[i - 1]!)) throw new Error("Box statistics must be ordered: min, Q1, median, Q3, max.")
      if (Array.isArray(record.outliers) && record.outliers.length === 0) parsed.outliers = []
      else if (record.outliers !== undefined) parsed.outliers = numbers("outliers")
      parsed.box = [box[0]!, box[1]!, box[2]!, box[3]!, box[4]!]
    }
    if (view.chart === "sankey") parsed.destination = text("destination")
    return parsed
  })
  if (view.sort && view.sort !== "none") rows.sort((a, b) => view.sort === "asc" ? a.value - b.value : b.value - a.value)
  const visible = rows.slice(0, view.limit ?? 100)
  if (["line", "area", "bar", "ranking", "stacked-bar", "radar", "progress", "calendar", "bullet", "boxplot", "change-ranking", "trend-metric", "treemap"].includes(view.chart)) {
    const seen = new Set<string>()
    for (const row of visible) {
      const key = JSON.stringify([row.label, row.series])
      if (seen.has(key)) throw new Error("Aggregate repeated labels within each series in the data producer.")
      seen.add(key)
    }
  }
  if (view.chart === "radar" && visible.length > 0 && visible.length < 3) throw new Error("Radar needs at least three values.")
  if (view.chart === "calendar" && visible.length) {
    const dates = visible.map(row => row.label).sort()
    if ((Date.parse(dates.at(-1)!) - Date.parse(dates[0]!)) / 86400000 > 366) throw new Error("Calendar range must fit within 367 days.")
  }
  if (view.chart === "waterfall") {
    let total = 0
    for (const row of visible) {
      total += row.value
      if (!Number.isFinite(total)) throw new Error("Waterfall totals must remain finite.")
    }
  }
  if (view.chart === "sankey") {
    const edges = new Map<string, Set<string>>()
    for (const row of visible) {
      if (!edges.has(row.label)) edges.set(row.label, new Set())
      edges.get(row.label)!.add(row.destination!)
    }
    const visited = new Set<string>()
    const active = new Set<string>()
    const visit = (node: string): void => {
      if (active.has(node)) throw new Error("Sankey flows must not contain cycles.")
      if (visited.has(node)) return
      active.add(node)
      for (const next of edges.get(node) ?? []) visit(next)
      active.delete(node)
      visited.add(node)
    }
    for (const node of edges.keys()) visit(node)
  }
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
