import { describe, expect, it } from "vitest"
import { adaptiveCacheAlgorithms, getBestAdaptiveCacheAlgorithm } from "./adaptive"
import { runAlgorithmBenchmarkSuite, runPolicyBenchmark } from "./benchmark"
import {
  createHottestSnapshot,
  createTimelineSnapshot,
  getHottestVersion,
  getTimelineVersion,
  minute,
} from "./fixtures"

describe("adaptive policy benchmarks", () => {
  it("beats fixed max freshness while using fewer fetches than fixed fast for timeline sources", () => {
    const fixedFast = runPolicyBenchmark({
      createSnapshot: createTimelineSnapshot,
      getVersion: getTimelineVersion,
      mode: "timeline",
      policy: "fixed-fast",
      maxCacheAge: minute,
      durationMinutes: 360,
      prefix: "timeline",
    })
    const fixedMax = runPolicyBenchmark({
      createSnapshot: createTimelineSnapshot,
      getVersion: getTimelineVersion,
      mode: "timeline",
      policy: "fixed-max",
      maxCacheAge: 30 * minute,
      durationMinutes: 360,
      prefix: "timeline",
    })
    const adaptive = runPolicyBenchmark({
      createSnapshot: createTimelineSnapshot,
      getVersion: getTimelineVersion,
      mode: "timeline",
      policy: "adaptive",
      maxCacheAge: 30 * minute,
      durationMinutes: 360,
      prefix: "timeline",
    })

    expect(adaptive.fetches).toBeLessThan(fixedFast.fetches)
    expect(adaptive.fetches).toBeGreaterThan(fixedMax.fetches)
    expect(adaptive.averageStaleLag).toBeLessThan(fixedMax.averageStaleLag)
    expect(adaptive.stalePolls).toBeLessThan(fixedMax.stalePolls)
    expect(adaptive.finalAdaptiveAge).toBeGreaterThanOrEqual(minute)
    expect(adaptive.finalAdaptiveAge).toBeLessThanOrEqual(30 * minute)
  })

  it("beats fixed max freshness while using fewer fetches than fixed fast for hottest sources", () => {
    const fixedFast = runPolicyBenchmark({
      createSnapshot: createHottestSnapshot,
      getVersion: getHottestVersion,
      mode: "hottest",
      policy: "fixed-fast",
      maxCacheAge: minute,
      durationMinutes: 360,
      prefix: "hot",
    })
    const fixedMax = runPolicyBenchmark({
      createSnapshot: createHottestSnapshot,
      getVersion: getHottestVersion,
      mode: "hottest",
      policy: "fixed-max",
      maxCacheAge: 30 * minute,
      durationMinutes: 360,
      prefix: "hot",
    })
    const adaptive = runPolicyBenchmark({
      createSnapshot: createHottestSnapshot,
      getVersion: getHottestVersion,
      mode: "hottest",
      policy: "adaptive",
      maxCacheAge: 30 * minute,
      durationMinutes: 360,
      prefix: "hot",
    })

    expect(adaptive.fetches).toBeLessThan(fixedFast.fetches)
    expect(adaptive.fetches).toBeGreaterThan(fixedMax.fetches)
    expect(adaptive.averageStaleLag).toBeLessThan(fixedMax.averageStaleLag)
    expect(adaptive.stalePolls).toBeLessThan(fixedMax.stalePolls)
    expect(adaptive.finalAdaptiveAge).toBeGreaterThanOrEqual(minute)
    expect(adaptive.finalAdaptiveAge).toBeLessThanOrEqual(30 * minute)
  })

  it("selects the best timeline algorithm from benchmark scores", () => {
    const results = runAlgorithmBenchmarkSuite({
      algorithms: adaptiveCacheAlgorithms,
      createSnapshot: createTimelineSnapshot,
      getVersion: getTimelineVersion,
      mode: "timeline",
      maxCacheAge: 30 * minute,
      durationMinutes: 360,
      prefix: "timeline",
    })

    expect(results[0]?.algorithm).toBe("economical")
    expect(getBestAdaptiveCacheAlgorithm("timeline")).toBe(results[0]?.algorithm)
  })

  it("selects the best hottest algorithm from benchmark scores", () => {
    const results = runAlgorithmBenchmarkSuite({
      algorithms: adaptiveCacheAlgorithms,
      createSnapshot: createHottestSnapshot,
      getVersion: getHottestVersion,
      mode: "hottest",
      maxCacheAge: 30 * minute,
      durationMinutes: 360,
      prefix: "hot",
    })

    expect(results[0]?.algorithm).toBe("optimizer")
    expect(getBestAdaptiveCacheAlgorithm("hottest")).toBe(results[0]?.algorithm)
  })
})
