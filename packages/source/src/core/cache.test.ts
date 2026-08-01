import { describe, expect, it } from "vitest"
import { parseSourceCacheMaxAge } from "./cache"

describe("source cache", () => {
  it.each([
    ["30s", 30_000],
    ["5m", 300_000],
    ["2h", 7_200_000],
    ["1d", 86_400_000],
  ] as const)("parses %s", (maxAge, milliseconds) => {
    expect(parseSourceCacheMaxAge(maxAge)).toBe(milliseconds)
  })
})
