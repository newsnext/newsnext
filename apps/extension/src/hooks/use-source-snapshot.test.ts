import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"
import {
  createLiveCardQueryTarget,
  createSourceQueryTarget,
  getSourceQueryKey,
} from "./source-query"
import {
  findLiveCardSnapshot,
  findSourceSnapshot,
  findSourceSnapshotResult,
} from "./use-source-snapshot"

vi.mock("@/lib/source", () => ({
  loadSource: vi.fn(),
  SOURCE_QUERY_REFETCH_INTERVAL_MS: 300_000,
  SOURCE_QUERY_STALE_TIME_MS: 70_000,
}))

const source = {
  id: "test:feed",
  version: 3,
  capabilities: { cookies: [], network: [] },
  metadata: { title: "Test feed" },
  provider: { color: "blue", title: "Test" },
} as const

describe("findSourceSnapshotResult", () => {
  it("resolves the presentation snapshot for an unavailable Source", () => {
    const queryClient = new QueryClient()
    const target = createSourceQueryTarget(source.id, source, {})
    const result = { items: [], source }
    queryClient.setQueryData(getSourceQueryKey(target), {
      fetchProtected: true,
      fetchedAt: 100,
      loadedAt: 100,
      params: {},
      result,
    }, { updatedAt: 100 })
    queryClient.getQueryCache().build(
      queryClient,
      queryClient.defaultQueryOptions({
        queryKey: ["source", "pending:feed", 3, {}],
      }),
    )

    expect(findSourceSnapshotResult(queryClient, source.id, {})).toBe(result)
    expect(findSourceSnapshot(queryClient, source.id, {})).toEqual({
      data: result,
      loadedAt: 100,
    })
    expect(findSourceSnapshotResult(queryClient, "other:feed", {})).toBeUndefined()
  })

  it("ignores invalid snapshot results that have no Source snapshot", () => {
    const queryClient = new QueryClient()
    const target = createSourceQueryTarget(source.id, source, {})
    queryClient.setQueryData(getSourceQueryKey(target), {
      fetchProtected: true,
      fetchedAt: 100,
      loadedAt: 100,
      params: {},
      result: { items: [] },
    }, { updatedAt: 100 })

    expect(findSourceSnapshotResult(queryClient, source.id, {})).toBeUndefined()
  })

  it("finds a persisted LiveCard by identity after its request configuration changes", () => {
    const queryClient = new QueryClient()
    const target = createLiveCardQueryTarget("card-a")
    const result = { items: [], source }
    queryClient.setQueryData(getSourceQueryKey(target), {
      fetchProtected: true,
      fetchedAt: 100,
      loadedAt: 100,
      params: { topic: "old" },
      result,
    })

    expect(
      findLiveCardSnapshot(queryClient, "card-a", source.id)?.data,
    ).toBe(result)
    expect(
      findLiveCardSnapshot(queryClient, "card-b", source.id),
    ).toBeUndefined()
  })
})
