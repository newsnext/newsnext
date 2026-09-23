import type { WidgetWordCloudView } from "@newsnext/sdk/models"

export interface WordCloudRow {
  label: string
  value: number
}

/** Invalid observations are surfaced, never silently converted to zero. */
export function parseWordCloudRows(input: unknown, view: WidgetWordCloudView): WordCloudRow[] {
  if (!input || typeof input !== "object" || !("rows" in input) || !Array.isArray(input.rows)) throw new Error("Expected a query result with a rows array.")
  if (input.rows.length > 10_000) throw new Error("Word cloud data exceeds 10,000 rows.")
  const rows = input.rows.map((row: unknown, index): WordCloudRow => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error(`Row ${index + 1} must be an object.`)
    const record = row as Record<string, unknown>
    const label = record[view.label ?? "label"]
    const value = record[view.value ?? "value"]
    if (typeof label !== "string" && !(typeof label === "number" && Number.isFinite(label))) throw new Error(`Row ${index + 1} needs a label.`)
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Row ${index + 1} needs a finite numeric value.`)
    if (value < 0) throw new Error("Word cloud requires non-negative values.")
    return { label: String(label), value }
  })
  if (view.sort && view.sort !== "none") rows.sort((a, b) => view.sort === "asc" ? a.value - b.value : b.value - a.value)
  return rows.slice(0, view.limit ?? 100)
}
