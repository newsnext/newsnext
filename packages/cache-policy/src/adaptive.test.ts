import type { AdaptiveCacheState } from "./typings"
import { describe, expect, it } from "vitest"
import {
  getEffectiveMaxCacheAge,
  getHottestChangeScore,
  getTimelineChangeScore,
  minute,
  updateAdaptiveCacheState,
  updateAdaptiveCacheStateForError,
} from "./index"

function createState(overrides: Partial<AdaptiveCacheState> = {}): AdaptiveCacheState {
  return {
    currentMaxCacheAge: minute,
    lastFetchedAt: 0,
    unchangedStreak: 0,
    errorStreak: 0,
    hourlyChangeScores: Array.from({ length: 24 }, () => 1),
    averageChangeScore: 1,
    ...overrides,
  }
}

describe("adaptive cache policy", () => {
  it("scores new leading items for timeline sources", () => {
    expect(getTimelineChangeScore([{ id: "a" }, { id: "b" }], [{ id: "c" }, { id: "a" }])).toBe(0.5)
  })

  it("scores rank movement for hottest sources", () => {
    expect(getHottestChangeScore(
      [{ id: "a" }, { id: "b" }, { id: "c" }],
      [{ id: "b" }, { id: "a" }, { id: "c" }],
    )).toBeCloseTo(1 / 3)
  })

  it("grows age after unchanged timeline fetches", () => {
    const state = updateAdaptiveCacheState({
      previous: [{ id: "a" }],
      next: [{ id: "a" }],
      state: createState(),
      now: 2 * minute,
      minFetchAge: minute,
      maxCacheAge: 10 * minute,
      mode: "timeline",
    })

    expect(state.currentMaxCacheAge).toBe(2 * minute)
    expect(state.unchangedStreak).toBe(1)
  })

  it("returns timeline age to min when new items appear", () => {
    const state = updateAdaptiveCacheState({
      previous: [{ id: "a" }, { id: "b" }],
      next: [{ id: "c" }, { id: "a" }, { id: "b" }],
      state: createState({ currentMaxCacheAge: 4 * minute, unchangedStreak: 12 }),
      now: 5 * minute,
      minFetchAge: minute,
      maxCacheAge: 30 * minute,
      mode: "timeline",
    })

    expect(state.currentMaxCacheAge).toBe(minute)
    expect(state.unchangedStreak).toBe(0)
    expect(state.lastChangedAt).toBe(5 * minute)
  })

  it("tolerates small hottest jitter and reduces age on major reshuffles", () => {
    const jitterState = updateAdaptiveCacheState({
      previous: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }],
      next: [{ id: "b" }, { id: "a" }, { id: "c" }, { id: "d" }, { id: "e" }],
      state: createState(),
      now: 2 * minute,
      minFetchAge: minute,
      maxCacheAge: 30 * minute,
      mode: "hottest",
    })

    expect(jitterState.currentMaxCacheAge).toBe(2 * minute)
    expect(jitterState.unchangedStreak).toBe(1)

    const reshuffledState = updateAdaptiveCacheState({
      previous: [{ id: "b" }, { id: "a" }, { id: "c" }, { id: "d" }, { id: "e" }],
      next: [{ id: "x" }, { id: "y" }, { id: "z" }, { id: "a" }, { id: "b" }],
      state: jitterState,
      now: 3 * minute,
      minFetchAge: minute,
      maxCacheAge: 30 * minute,
      mode: "hottest",
    })

    expect(reshuffledState.currentMaxCacheAge).toBe(84_000)
    expect(reshuffledState.unchangedStreak).toBe(0)
    expect(reshuffledState.lastChangedAt).toBe(3 * minute)
  })

  it("extends effective age during quiet UTC hours without exceeding max", () => {
    expect(getEffectiveMaxCacheAge({
      state: createState({
        currentMaxCacheAge: minute,
        hourlyChangeScores: Array.from({ length: 24 }, () => 0),
        averageChangeScore: 0,
      }),
      now: Date.UTC(2026, 0, 1, 3, 0, 0),
      minFetchAge: minute,
      maxCacheAge: 3 * minute,
    })).toBe(3 * minute)
  })

  it("backs off after errors", () => {
    const state = updateAdaptiveCacheStateForError({
      state: createState(),
      now: 2 * minute,
      minFetchAge: minute,
      maxCacheAge: 30 * minute,
    })

    expect(state.currentMaxCacheAge).toBe(2 * minute)
    expect(state.errorStreak).toBe(1)
  })
})
