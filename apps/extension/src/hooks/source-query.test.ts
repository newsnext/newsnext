import { describe, expect, it, vi } from "vitest"
import { createSourceQueryTarget, getSourceQueryKey } from "./source-query"

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

  it("shares results within a Node while isolating remote Nodes", () => {
    const sourceId = "github:notifications"
    const source = { version: 1 }

    expect(
      getSourceQueryKey(createSourceQueryTarget(sourceId, source)),
    ).toEqual(
      getSourceQueryKey(createSourceQueryTarget(sourceId, source)),
    )
    expect(
      getSourceQueryKey(createSourceQueryTarget(sourceId, source, {}, {
        instanceId: "personal",
        nodeId: "home",
      })),
    ).not.toEqual(
      getSourceQueryKey(createSourceQueryTarget(sourceId, source, {}, {
        instanceId: "work",
        nodeId: "office",
      })),
    )
    expect(
      getSourceQueryKey(createSourceQueryTarget(sourceId, source, {}, {
        instanceId: "personal",
        nodeId: "home",
      })),
    ).toEqual(
      getSourceQueryKey(createSourceQueryTarget(sourceId, source, {}, {
        instanceId: "work",
        nodeId: "home",
      })),
    )
  })
})
