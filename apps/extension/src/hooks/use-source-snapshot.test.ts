import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"
import {
  createSourceQueryTarget,
  getSourceQueryKey,
} from "./source-query"
import {
  findSourceSnapshot,
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

describe("findSourceSnapshot", () => {
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

    expect(findSourceSnapshot(queryClient, source.id, {})).toEqual({
      data: result,
      loadedAt: 100,
    })
    expect(findSourceSnapshot(queryClient, "other:feed", {})).toBeUndefined()
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

    expect(findSourceSnapshot(queryClient, source.id, {})).toBeUndefined()
  })
})
