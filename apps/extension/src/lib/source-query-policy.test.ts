import { describe, expect, it } from "vitest"
import { isFetchLatestRateLimited } from "./source-query-policy"

describe("source query policy", () => {
  it("rate-limits fetch-latest requests for one minute", () => {
    const lastFetchedAt = 1_000_000

    expect(isFetchLatestRateLimited(lastFetchedAt, lastFetchedAt + 59_999)).toBe(true)
    expect(isFetchLatestRateLimited(lastFetchedAt, lastFetchedAt + 60_000)).toBe(false)
  })
})
