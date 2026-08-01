import { describe, expect, it } from "vitest"
import {
  isFetchLatestRateLimited,
  shouldReuseCachedSource,
} from "./source-query-policy"

describe("source query policy", () => {
  it("rate-limits fetch-latest requests for one minute", () => {
    const lastFetchedAt = 1_000_000

    expect(isFetchLatestRateLimited(lastFetchedAt, lastFetchedAt + 59_999)).toBe(true)
    expect(isFetchLatestRateLimited(lastFetchedAt, lastFetchedAt + 60_000)).toBe(false)
  })

  it("uses source freshness for automatic loads", () => {
    expect(shouldReuseCachedSource({
      cachedAt: 0,
      fetchLatest: false,
      isFresh: true,
      now: 1_000_000,
    })).toBe(true)
    expect(shouldReuseCachedSource({
      cachedAt: 999_999,
      fetchLatest: false,
      isFresh: false,
      now: 1_000_000,
    })).toBe(false)
  })

  it("uses only the protection interval for fetch-latest loads", () => {
    expect(shouldReuseCachedSource({
      cachedAt: 940_001,
      fetchLatest: true,
      isFresh: false,
      now: 1_000_000,
    })).toBe(true)
    expect(shouldReuseCachedSource({
      cachedAt: 940_000,
      fetchLatest: true,
      isFresh: true,
      now: 1_000_000,
    })).toBe(false)
  })
})
