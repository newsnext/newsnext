import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"
import { createSourceQueryTarget, getSourceQueryKey } from "./source-query"
import {
  findCachedSourceQuery,
  findCachedSourceResult,
} from "./use-cached-source-result"

vi.mock("@/lib/source", () => ({
  loadSource: vi.fn(),
  SOURCE_QUERY_REFETCH_INTERVAL_MS: 300_000,
  SOURCE_QUERY_STALE_TIME_MS: 120_000,
}))

const source = {
  id: "test:feed",
  version: 3,
  capabilities: { cookies: [], network: [] },
  metadata: { title: "Test feed" },
  provider: { color: "blue", title: "Test" },
} as const

describe("findCachedSourceResult", () => {
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

    expect(findCachedSourceResult(queryClient, source.id, {})).toBe(result)
    expect(findCachedSourceQuery(queryClient, source.id, {})).toEqual({
      data: result,
      loadedAt: 100,
    })
    expect(findCachedSourceResult(queryClient, "other:feed", {})).toBeUndefined()
  })

  it("ignores invalid cached results that have no Source snapshot", () => {
    const queryClient = new QueryClient()
    const target = createSourceQueryTarget(source.id, source, {})
    queryClient.setQueryData(getSourceQueryKey(target), {
      fetchProtected: true,
      fetchedAt: 100,
      loadedAt: 100,
      params: {},
      result: { items: [] },
    }, { updatedAt: 100 })

    expect(findCachedSourceResult(queryClient, source.id, {})).toBeUndefined()
  })
})
