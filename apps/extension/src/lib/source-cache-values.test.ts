import { describe, expect, it } from "vitest"
import {
  buildSourceCacheKey,
  parseCacheMaxAge,
  resolveSourceCacheMaxAge,
} from "./source-cache-values"

describe("source cache values", () => {
  it("builds stable keys regardless of parameter order", () => {
    expect(buildSourceCacheKey("test:latest", 2, {
      page: 1,
      query: "news",
    })).toBe(buildSourceCacheKey("test:latest", 2, {
      query: "news",
      page: 1,
    }))
  })

  it.each([
    ["30s", 30_000],
    ["5m", 300_000],
    ["2h", 7_200_000],
    ["1d", 86_400_000],
  ] as const)("parses %s", (maxAge, milliseconds) => {
    expect(parseCacheMaxAge(maxAge)).toBe(milliseconds)
  })

  it("uses the source cache duration for automatic loads", () => {
    expect(resolveSourceCacheMaxAge("15m", false)).toBe(15 * 60_000)
  })

  it("limits fetch-latest requests to once per minute", () => {
    expect(resolveSourceCacheMaxAge("15m", true)).toBe(60_000)
    expect(resolveSourceCacheMaxAge("10s", true)).toBe(60_000)
  })
})
