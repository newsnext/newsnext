import { describe, expect, it } from "vitest"
import { historyTime, NewsNextError, parseFrame, prepareRequest, timeRange } from "./protocol.js"

describe("history time boundaries", () => {
  it("normalizes milliseconds, UTC dates and explicit offsets", () => {
    expect(historyTime("1970-01-02")).toBe(86_400_000)
    expect(historyTime("1970-01-01T08:00:01+08:00")).toBe(1000)
    expect(historyTime("1000")).toBe(1000)
    expect(historyTime(new Date(1000))).toBe(1000)
  })
  it("rejects ambiguous, negative and unsafe times", () => {
    for (const time of ["2026-09-08T12:00:00", "yesterday", "2026-02-30", "2026-02-30T00:00:00Z", -1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => historyTime(time)).toThrow()
    }
    expect(() => timeRange(2, 1)).toThrow()
  })
})

describe("cLI protocol frames", () => {
  it("preserves structured errors and unicode data", () => {
    expect(parseFrame("{\"version\":1,\"type\":\"data\",\"data\":{\"title\":\"微博\"}}")).toEqual({ type: "data", data: { title: "微博" } })
    expect(parseFrame("{\"version\":1,\"type\":\"error\",\"error\":{\"code\":\"HISTORY_INCOMPLETE\",\"message\":\"Missing revision\"}}")).toEqual({ type: "error", error: { code: "HISTORY_INCOMPLETE", message: "Missing revision" } })
  })
  it("rejects incompatible versions and malformed envelopes", () => {
    expect(() => parseFrame("not JSON")).toThrow(NewsNextError)
    for (const value of [null, {}, { version: 2, type: "end" }, { version: 1, type: "data" }, { version: 1, type: "error", error: "failed" }]) {
      expect(() => parseFrame(JSON.stringify(value))).toThrow(NewsNextError)
    }
  })
})

describe("sdk request limits", () => {
  it("validates timeouts and protects protocol envelope fields", () => {
    for (const timeout of [0, -1, 600001, 1.5, NaN, Infinity]) {
      expect(() => prepareRequest({ method: "status" }, timeout)).toThrow(RangeError)
    }
    const { payload, serialized } = prepareRequest({ method: "status", version: 2, timeoutMs: -1 })
    expect(payload).toEqual({ method: "status", version: 1, timeoutMs: 60000 })
    expect(JSON.parse(serialized)).toEqual(payload)
  })

  it("measures request size in UTF-8 bytes", () => {
    expect(() => prepareRequest({ data: "界".repeat(3 * 1024 * 1024) })).toThrow("8 MiB")
  })
})
