import { describe, expect, it, vi } from "vitest"
import { getSourceQueryKey } from "./source-query"

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
      null,
    ])
  })

  it("isolates cached results by Instance account", () => {
    const base = {
      params: {},
      sourceId: "github:notifications",
      version: 1,
    }

    expect(
      getSourceQueryKey({ ...base, instanceId: "personal" }),
    ).not.toEqual(
      getSourceQueryKey({ ...base, instanceId: "work" }),
    )
  })
})
