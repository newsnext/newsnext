import type { BenchmarkItem, BenchmarkSnapshot } from "./fixtures"
import type { AdaptiveCacheAlgorithm, AdaptiveCacheMode, AdaptiveCacheState } from "./typings"
import { getEffectiveMaxCacheAge, updateAdaptiveCacheState } from "./adaptive"
import { getServedVersion, getVersionChangedAt, minute } from "./fixtures"

export type BenchmarkPolicy = "fixed-fast" | "fixed-max" | "adaptive"

export interface BenchmarkOptions {
  createSnapshot: (now: number) => BenchmarkSnapshot
  getVersion: (currentMinute: number) => number
  mode: AdaptiveCacheMode
  policy: BenchmarkPolicy
  maxCacheAge: number
  durationMinutes: number
  prefix: string
  minFetchAge?: number
  algorithm?: AdaptiveCacheAlgorithm
}

export interface BenchmarkResult {
  fetches: number
  stalePolls: number
  averageStaleLag: number
  finalAdaptiveAge?: number
}

export interface BenchmarkCandidateResult extends BenchmarkResult {
  algorithm: AdaptiveCacheAlgorithm
  score: number
}

export interface BenchmarkSuiteOptions extends Omit<BenchmarkOptions, "policy" | "algorithm"> {
  algorithms: AdaptiveCacheAlgorithm[]
  staleLagWeight?: number
  fetchWeight?: number
}

interface SimulatedCacheEntry {
  items: BenchmarkItem[]
  updatedAt: number
}

export function runPolicyBenchmark({
  createSnapshot,
  getVersion,
  mode,
  policy,
  maxCacheAge,
  durationMinutes,
  prefix,
  minFetchAge = minute,
  algorithm,
}: BenchmarkOptions): BenchmarkResult {
  let cache: SimulatedCacheEntry | undefined
  let state: AdaptiveCacheState | undefined
  let fetches = 0
  let stalePolls = 0
  let staleLag = 0

  for (let currentMinute = 0; currentMinute <= durationMinutes; currentMinute++) {
    const now = currentMinute * minute
    const latest = createSnapshot(now)
    const policyMaxCacheAge = policy === "fixed-fast" ? minFetchAge : maxCacheAge
    const effectiveMaxCacheAge = policy === "adaptive"
      ? getEffectiveMaxCacheAge({ state, now, minFetchAge, maxCacheAge, algorithm })
      : policyMaxCacheAge
    const shouldFetch = !cache || now - cache.updatedAt >= effectiveMaxCacheAge

    if (shouldFetch) {
      const previous = cache?.items
      cache = {
        items: latest.items,
        updatedAt: now,
      }
      fetches += 1
      if (policy === "adaptive") {
        state = updateAdaptiveCacheState({
          previous,
          next: latest.items,
          state,
          now,
          minFetchAge,
          maxCacheAge,
          mode,
          algorithm,
        })
      }
    }

    if (!cache) {
      continue
    }

    const servedVersion = getServedVersion(cache.items, prefix)
    if (servedVersion < latest.version) {
      stalePolls += 1
      staleLag += now - getVersionChangedAt(servedVersion, getVersion, currentMinute)
    }
  }

  return {
    fetches,
    stalePolls,
    averageStaleLag: staleLag / (durationMinutes + 1),
    finalAdaptiveAge: state?.currentMaxCacheAge,
  }
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) {
    return 0
  }

  return (value - min) / (max - min)
}

export function runAlgorithmBenchmarkSuite({
  algorithms,
  staleLagWeight = 0.65,
  fetchWeight = 0.35,
  ...options
}: BenchmarkSuiteOptions): BenchmarkCandidateResult[] {
  const results = algorithms.map((algorithm) => {
    const result = runPolicyBenchmark({
      ...options,
      policy: "adaptive",
      algorithm,
    })
    return { algorithm, ...result }
  })
  const fetches = results.map(result => result.fetches)
  const staleLags = results.map(result => result.averageStaleLag)
  const minFetches = Math.min(...fetches)
  const maxFetches = Math.max(...fetches)
  const minStaleLag = Math.min(...staleLags)
  const maxStaleLag = Math.max(...staleLags)

  return results
    .map(result => ({
      ...result,
      score:
        staleLagWeight * normalize(result.averageStaleLag, minStaleLag, maxStaleLag)
        + fetchWeight * normalize(result.fetches, minFetches, maxFetches),
    }))
    .sort((a, b) => a.score - b.score)
}
