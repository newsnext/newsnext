import type { SourceRadarPageParam } from "../../models/index.js"
import { describe, expect, it } from "vitest"
import { resolveProvider } from "../registry/provider"
import { toSourceDescriptor } from "../runtime"
import { resolveRadarPageParamValue } from "./radar-page"

const selected: SourceRadarPageParam = {
  type: "selected",
  select: ".tabs a",
  active: ".active",
  values: ["latest", "hot"],
  default: "latest",
}

describe("portable Radar parameters", () => {
  it("maps control order and preserves missing/default semantics", () => {
    expect(resolveRadarPageParamValue(selected, 1)).toBe("hot")
    expect(resolveRadarPageParamValue(selected, -1)).toBe("latest")
    expect(resolveRadarPageParamValue({ ...selected, default: undefined }, -1)).toBeUndefined()
    expect(resolveRadarPageParamValue(selected, null)).toBeUndefined()
    expect(resolveRadarPageParamValue(selected, 0.5)).toBeUndefined()
  })

  it("decodes URL query values with a bounded number of passes", () => {
    const query: SourceRadarPageParam = { type: "query", key: "keyword", decode: 2 }
    expect(resolveRadarPageParamValue(query, "%25E6%25B8%25B8%25E6%2588%258F")).toBe("游戏")
    expect(resolveRadarPageParamValue(query, "100% invalid")).toBe("100% invalid")
    expect(resolveRadarPageParamValue(query, "")).toBeUndefined()
    expect(resolveRadarPageParamValue(query, null)).toBeUndefined()
  })

  it("formats epoch values in the requested time zone", () => {
    const query: SourceRadarPageParam = { type: "query", key: "start", timestamp: { unit: "seconds", timezone: "Asia/Shanghai" } }
    const timestamp = Date.parse("2026-01-01T20:00:00Z")
    expect(resolveRadarPageParamValue(query, String(timestamp / 1000))).toBe("2026-01-02")
    expect(resolveRadarPageParamValue({ ...query, timestamp: { unit: "milliseconds", timezone: "UTC" } }, String(timestamp))).toBe("2026-01-01")
    for (const value of ["", "0", "invalid", "-1"]) expect(resolveRadarPageParamValue(query, value)).toBeUndefined()
  })

  it("maps inclusive date ranges and omits invalid boundaries", () => {
    const query: SourceRadarPageParam = { type: "date-range", start: "start", end: "end", ranges: { 1: "day", 7: "week", 180: "halfyear" }, other: "custom" }
    for (const [days, value] of [[1, "day"], [7, "week"], [180, "halfyear"], [3, "custom"]] as const) {
      expect(resolveRadarPageParamValue(query, { start: "100000", end: String(100000 + (days - 1) * 86400) })).toBe(value)
    }
    for (const value of [{ start: null, end: null }, { start: "200", end: "100" }, { start: "bad", end: "200" }]) {
      expect(resolveRadarPageParamValue(query, value)).toBeUndefined()
    }
  })

  it("keeps page rules through Provider JSON transport and resolution", () => {
    const provider = {
      title: "Example",
      color: "slate" as const,
      sources: { top: {
        loader: { type: "json" as const, url: "https://example.com/feed", fields: { title: "title", url: "url" } },
        radar: [{ id: "tabs", match: { hosts: ["example.com"] }, patch: { params: { order: selected } } }],
      } },
    }
    const source = resolveProvider("example", JSON.parse(JSON.stringify(provider))).sources.top!
    const descriptor = toSourceDescriptor("example:top", source)
    expect(descriptor.radar).toEqual(provider.sources.top.radar)
    for (const invalid of [
      { ...selected, reveal: { trigger: ".filter", visible: ".panel", waitMs: 1001 } },
      { type: "query", key: "keyword", decode: 3 },
      () => "hot",
    ]) {
      expect(() => resolveProvider("example", {
        ...provider,
        sources: { top: { ...provider.sources.top, radar: [{ id: "invalid", match: { hosts: ["example.com"] }, patch: { params: { order: invalid } } }] } },
      } as never)).toThrow()
    }
  })
})
