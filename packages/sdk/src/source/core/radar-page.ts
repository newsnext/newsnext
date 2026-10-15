import type { SourceRadarPageParam } from "../../models/index.js"

/** Map a page read to its parameter value; missing controls retain Source defaults. */
export function resolveRadarPageParamValue(
  query: SourceRadarPageParam,
  value: unknown,
): string | undefined {
  if (query.type === "selected") {
    return typeof value === "number" && Number.isSafeInteger(value)
      ? query.values[value] ?? query.default
      : undefined
  }
  if (query.type === "date-range") {
    if (!value || typeof value !== "object" || !("start" in value) || !("end" in value)) return undefined
    const start = Number(value.start)
    const end = Number(value.end)
    if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end < start) return undefined
    return query.ranges[String(Math.trunc((end - start) / 86_400) + 1)] ?? query.other
  }
  if (typeof value !== "string") return undefined
  if (query.timestamp) {
    const timestamp = Number(value)
    if (!Number.isFinite(timestamp) || timestamp <= 0) return undefined
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: query.timestamp.timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(timestamp * (query.timestamp.unit === "seconds" ? 1000 : 1))
      const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
      return `${values.year}-${values.month}-${values.day}`
    } catch {
      return undefined
    }
  }
  let result = value
  for (let pass = 0; pass < (query.decode ?? 0); pass += 1) {
    try {
      const decoded = decodeURIComponent(result)
      if (decoded === result) break
      result = decoded
    } catch {
      break
    }
  }
  return result || undefined
}
