export const minute = 60_000

export interface BenchmarkItem {
  id: string
}

export interface BenchmarkSnapshot {
  items: BenchmarkItem[]
  version: number
  changedAt: number
}

export function getTimelineVersion(currentMinute: number): number {
  if (currentMinute < 60) {
    return Math.floor(currentMinute / 2)
  }
  if (currentMinute < 180) {
    return 30 + Math.floor((currentMinute - 60) / 30)
  }
  if (currentMinute < 240) {
    return 34 + Math.floor((currentMinute - 180) / 3)
  }
  return 54 + Math.floor((currentMinute - 240) / 60)
}

export function getHottestVersion(currentMinute: number): number {
  if (currentMinute < 90) {
    return Math.floor(currentMinute / 10)
  }
  if (currentMinute < 210) {
    return 9 + Math.floor((currentMinute - 90) / 45)
  }
  if (currentMinute < 270) {
    return 12 + Math.floor((currentMinute - 210) / 12)
  }
  return 17 + Math.floor((currentMinute - 270) / 60)
}

export function getChangedAt(currentMinute: number, getVersion: (currentMinute: number) => number): number {
  const version = getVersion(currentMinute)
  for (let candidate = currentMinute; candidate >= 0; candidate--) {
    if (getVersion(candidate) !== version) {
      return (candidate + 1) * minute
    }
  }

  return 0
}

export function getVersionChangedAt(
  version: number,
  getVersion: (currentMinute: number) => number,
  currentMinute: number,
): number {
  for (let candidate = 0; candidate <= currentMinute; candidate++) {
    if (getVersion(candidate) === version) {
      return candidate * minute
    }
  }

  return 0
}

export function createTimelineSnapshot(now: number): BenchmarkSnapshot {
  const currentMinute = Math.floor(now / minute)
  const version = getTimelineVersion(currentMinute)
  return {
    version,
    changedAt: getChangedAt(currentMinute, getTimelineVersion),
    items: [
      { id: `timeline-${version}` },
      { id: `timeline-${Math.max(0, version - 1)}` },
      { id: `timeline-${Math.max(0, version - 2)}` },
    ],
  }
}

export function createHottestSnapshot(now: number): BenchmarkSnapshot {
  const currentMinute = Math.floor(now / minute)
  const version = getHottestVersion(currentMinute)
  const jitter = currentMinute % 2 === 0
  const stableTail = [
    { id: `hot-${version}-c` },
    { id: `hot-${version}-d` },
    { id: `hot-${version}-e` },
  ]

  return {
    version,
    changedAt: getChangedAt(currentMinute, getHottestVersion),
    items: jitter
      ? [{ id: `hot-${version}-b` }, { id: `hot-${version}-a` }, ...stableTail]
      : [{ id: `hot-${version}-a` }, { id: `hot-${version}-b` }, ...stableTail],
  }
}

export function getServedVersion(items: BenchmarkItem[], prefix: string): number {
  const id = items[0]?.id ?? ""
  const match = id.match(new RegExp(`^${prefix}-(\\d+)`))
  if (!match) {
    throw new Error(`Unable to parse benchmark version from ${id}`)
  }

  return Number(match[1])
}
