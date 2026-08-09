import { describe, expect, it } from "vitest"
import {
  parseHistoryCompareOptions,
  parseHistoryObservationsOptions,
  parseHistoryTime,
} from "./source-history"

describe("source history options", () => {
  it("parses observation filters and source parameters", () => {
    const options = parseHistoryObservationsOptions([
      "github:trending",
      "--params",
      "{\"language\":\"typescript\"}",
      "--from",
      "2026-08-08T10:00:00Z",
      "--limit",
      "25",
    ])

    expect(options.request).toMatchObject({
      type: "source-history.observations",
      sourceId: "github:trending",
      params: { language: "typescript" },
      from: Date.parse("2026-08-08T10:00:00Z"),
      limit: 25,
    })
  })

  it("accepts Unix milliseconds and ISO 8601 observation times", () => {
    expect(parseHistoryTime("1786212000000", "Time")).toBe(1_786_212_000_000)
    expect(parseHistoryTime("2026-08-08T10:00:00Z", "Time"))
      .toBe(Date.parse("2026-08-08T10:00:00Z"))
  })

  it("preserves comparison order", () => {
    const options = parseHistoryCompareOptions([
      "github:trending",
      "1786212000000",
      "1786215600000",
    ])

    expect(options.request).toMatchObject({
      before: 1_786_212_000_000,
      after: 1_786_215_600_000,
    })
  })

  it("rejects invalid limits and timestamps", () => {
    expect(() => parseHistoryObservationsOptions([
      "github:trending",
      "--limit",
      "0",
    ])).toThrow("--limit must be an integer between 1 and 250")
    expect(() => parseHistoryTime("not-a-time", "Time"))
      .toThrow("Time must be Unix milliseconds or an ISO 8601 date")
  })
})
