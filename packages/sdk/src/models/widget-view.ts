/** Built-in word cloud view. Data producers return named results independently. */
export interface WidgetWordCloudView {
  preset: "word-cloud"
  /** Names the `data.mjs` result consumed by this view. */
  query: string
  /** Literal row field names, not expressions; `label`/`value` keep their view mapping. */
  label?: string
  value?: string
  /** Row cap 1–500, default 100; sorting applies before the limit. */
  limit?: number
  sort?: "none" | "asc" | "desc"
}

export function parseWidgetWordCloudView(value: Record<string, unknown>): WidgetWordCloudView {
  const { preset, query, ...options } = value
  if (preset !== "word-cloud" || typeof query !== "string" || !/^[\w-]+$/.test(query)) throw new Error("Invalid Widget word-cloud query")
  const result: WidgetWordCloudView = { preset, query }
  for (const [key, entry] of Object.entries(options)) {
    switch (key) {
      case "label": case "value":
        if (typeof entry !== "string" || entry.length > 100 || !entry.trim()) throw new Error(`Invalid Widget ${key}`)
        result[key] = entry
        break
      case "limit":
        if (typeof entry !== "number" || !Number.isInteger(entry) || entry < 1 || entry > 500) throw new Error(`Invalid Widget ${key}`)
        result.limit = entry
        break
      case "sort":
        if (entry !== "none" && entry !== "asc" && entry !== "desc") throw new Error("Invalid Widget sort")
        result.sort = entry
        break
      default: throw new Error(`Unknown Widget word-cloud option: ${key}`)
    }
  }
  return result
}
