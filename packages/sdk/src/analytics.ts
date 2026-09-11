/** Pure data-producer utilities. Inputs are never mutated; dates use UTC. */
export interface Observation { label: string, value: number }
export interface PeriodChange { current: number, previous: number, delta: number, percent: number | null }

function finite(value: number): number {
  if (!Number.isFinite(value)) throw new Error("Expected a finite number")
  return value
}

export function groupCount<T>(items: readonly T[], key: (item: T) => string): Observation[] {
  const groups = new Map<string, number>()
  for (const item of items) {
    const label = key(item)
    groups.set(label, (groups.get(label) ?? 0) + 1)
  }
  return [...groups].map(([label, value]) => ({ label, value }))
}

/** Count observations in occupied UTC hour/day/week/month buckets; weeks start Monday. */
export function timeBuckets<T>(items: readonly T[], timestamp: (item: T) => string | number | Date, unit: "hour" | "day" | "week" | "month" = "day"): Observation[] {
  return groupCount(items, (item) => {
    const input = timestamp(item)
    if (typeof input === "string" && !/^\d{4}-\d{2}-\d{2}(?:$|T.*(?:Z|[+-]\d{2}:\d{2})$)/.test(input)) throw new Error("Timestamp must use an explicit timezone or YYYY-MM-DD")
    const date = new Date(input)
    if (!Number.isFinite(date.getTime())) throw new Error("Invalid timestamp")
    date.setUTCMinutes(0, 0, 0)
    if (unit !== "hour") date.setUTCHours(0)
    if (unit === "week") date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7)
    if (unit === "month") date.setUTCDate(1)
    return date.toISOString()
  }).sort((a, b) => a.label.localeCompare(b.label))
}

/** Equal scores preserve input order. */
export function topN<T>(items: readonly T[], score: (item: T) => number, count = 10): T[] {
  if (!Number.isInteger(count) || count < 0) throw new Error("Count must be a non-negative integer")
  return items.map(item => ({ item, score: finite(score(item)) })).sort((a, b) => b.score - a.score).slice(0, count).map(entry => entry.item)
}

/** A zero baseline has no defined percentage change. Negative baselines use their absolute magnitude. */
export function periodChange(current: number, previous: number): PeriodChange {
  const delta = finite(finite(current) - finite(previous))
  return { current, previous, delta, percent: previous === 0 ? null : finite(delta / Math.abs(previous) * 100) }
}

/** Full trailing windows only. Missing observations break a window rather than becoming zero. */
export function movingAverage(values: readonly (number | null)[], window: number): (number | null)[] {
  if (!Number.isInteger(window) || window < 1) throw new Error("Window must be a positive integer")
  let sum = 0
  let missing = 0
  return values.map((value, index) => {
    if (value === null) missing++
    else sum = finite(sum + finite(value))
    if (index >= window) {
      const outgoing = values[index - window]!
      if (outgoing === null) missing--
      else sum = finite(sum - outgoing)
    }
    return index < window - 1 || missing ? null : sum / window
  })
}

/** Compare unique identities, retaining the first observation of each identity. */
export function compareItems<T>(previous: readonly T[], current: readonly T[], key: (item: T) => string): { added: T[], removed: T[] } {
  const unique = (items: readonly T[]): Map<string, T> => {
    const result = new Map<string, T>()
    for (const item of items) {
      const id = key(item)
      if (!result.has(id)) result.set(id, item)
    }
    return result
  }
  const before = unique(previous)
  const after = unique(current)
  return { added: [...after].filter(([id]) => !before.has(id)).map(([, item]) => item), removed: [...before].filter(([id]) => !after.has(id)).map(([, item]) => item) }
}
