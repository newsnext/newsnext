import type { RadarPageParam } from "./matcher"
import { describe, expect, it } from "vitest"
import { resolveRadarUrlParamValues } from "./url-params"

const params: RadarPageParam[] = [
  { key: "keyword", query: { type: "query", key: "q", decode: 1 } },
  { key: "date", query: { type: "query", key: "start", timestamp: { unit: "seconds", timezone: "Asia/Shanghai" } } },
  { key: "period", query: { type: "date-range", start: "start", end: "end", ranges: { 7: "week" }, other: "custom" } },
  { key: "sort", query: { type: "selected", select: "button", active: ".active", values: ["hot"], default: "hot" } },
]

describe("radar URL parameters", () => {
  it("decodes query values and resolves dates while leaving controls to the page reader", () => {
    const start = Date.parse("2026-01-01T20:00:00Z") / 1000
    const search = new URLSearchParams({ q: encodeURIComponent("游戏"), start: String(start), end: String(start + 6 * 86400) })
    expect(resolveRadarUrlParamValues(`https://example.com/search?${search}`, params)).toEqual({
      keyword: "游戏",
      date: "2026-01-02",
      period: "week",
    })
  })

  it("preserves outer URL query semantics for hash routes and repeated keys", () => {
    expect(resolveRadarUrlParamValues("https://example.com/?q=first&q=second#/search?q=hash", params)).toEqual({ keyword: "first" })
  })

  it("omits missing or invalid values without affecting valid parameters", () => {
    expect(resolveRadarUrlParamValues("https://example.com/?q=100%25&start=invalid&end=200", params)).toEqual({ keyword: "100%" })
    expect(resolveRadarUrlParamValues("https://example.com/?q=", params)).toEqual({})
    expect(resolveRadarUrlParamValues("invalid", params)).toEqual({})
  })
})
