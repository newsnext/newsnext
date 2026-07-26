export function normalizeTimestamp(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined
  }

  const timestamp = typeof value === "number" ? value : Number(value)
  return Number.isFinite(timestamp) ? timestamp : undefined
}
