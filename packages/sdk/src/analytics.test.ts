import { describe, expect, it } from "vitest"
import { compareItems, groupCount, movingAverage, periodChange, timeBuckets, topN } from "./analytics"

describe("producer analytics", () => {
  it("counts stable groups including prototype-like names", () => {
    expect(groupCount(["__proto__", "a", "__proto__"], v => v)).toEqual([{ label: "__proto__", value: 2 }, { label: "a", value: 1 }])
  })
  it("uses UTC boundaries and Monday weeks across years", () => {
    expect(timeBuckets(["2026-01-01T00:30:00+02:00"], v => v)).toEqual([{ label: "2025-12-31T00:00:00.000Z", value: 1 }])
    expect(timeBuckets(["2026-01-01T12:00:00Z"], v => v, "week")[0]?.label).toBe("2025-12-29T00:00:00.000Z")
    expect(() => timeBuckets(["bad"], v => v)).toThrow(/timestamp/i)
    expect(() => timeBuckets(["2026-09-11T10:00:00"], v => v)).toThrow("timezone")
  })
  it("ranks stably without mutation and validates scores", () => {
    const input = [{ id: "a", score: 2 }, { id: "b", score: 3 }, { id: "c", score: 3 }]
    expect(topN(input, v => v.score, 2).map(v => v.id)).toEqual(["b", "c"])
    expect(input[0]?.id).toBe("a")
    expect(() => topN([NaN], v => v)).toThrow()
    expect(() => topN([], Number, -1)).toThrow()
  })
  it("handles zero and negative comparison baselines", () => {
    expect(periodChange(10, 0)).toEqual({ current: 10, previous: 0, delta: 10, percent: null })
    expect(periodChange(-5, -10).percent).toBe(50)
    expect(() => periodChange(Infinity, 1)).toThrow()
  })
  it("requires full moving windows and preserves missing data", () => {
    expect(movingAverage([1, 3, null, 5, 7, 9], 2)).toEqual([null, 2, null, null, 6, 8])
    expect(movingAverage([2, 4], 3)).toEqual([null, null])
    expect(() => movingAverage([1], 0)).toThrow()
  })
  it("compares unique identities with first observations preserved", () => {
    expect(compareItems([{ id: "a" }, { id: "b" }], [{ id: "b" }, { id: "c", n: 1 }, { id: "c", n: 2 }], v => v.id)).toEqual({ added: [{ id: "c", n: 1 }], removed: [{ id: "a" }] })
  })
})
