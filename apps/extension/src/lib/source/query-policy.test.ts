import { describe, expect, it } from "vitest"
import { isFetchLatestRateLimited } from "./query-policy"

describe("source query policy", () => {
  it("rate-limits fetch-latest requests for one minute", () => {
    const updatedAt = 1_000_000

    expect(isFetchLatestRateLimited(updatedAt, updatedAt + 59_999)).toBe(true)
    expect(isFetchLatestRateLimited(updatedAt, updatedAt + 60_000)).toBe(false)
  })
})
