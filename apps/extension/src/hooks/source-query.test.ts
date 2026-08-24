import { describe, expect, it, vi } from "vitest"
import {
  createInstanceQueryTarget,
  getSourceQueryKey,
} from "./source-query"

vi.mock("@/lib/source", () => ({
  loadSource: vi.fn(() => Promise.reject(new Error("Unexpected Source load"))),
  SOURCE_QUERY_REFETCH_INTERVAL_MS: 300_000,
  SOURCE_QUERY_STALE_TIME_MS: 120_000,
}))

describe("source queries", () => {
  it("includes the Source version in query identity", () => {
    const target = {
      params: { range: "daily" },
      sourceId: "github:trending",
      version: 3,
    }

    expect(getSourceQueryKey(target)).toEqual([
      "source",
      "github:trending",
      3,
      { range: "daily" },
    ])
  })

  it("identifies configured queries only by Instance", () => {
    expect(
      getSourceQueryKey(createInstanceQueryTarget("personal")),
    ).toEqual(["instance", "personal"])
    expect(
      getSourceQueryKey(createInstanceQueryTarget("work")),
    ).toEqual(["instance", "work"])
  })
})
