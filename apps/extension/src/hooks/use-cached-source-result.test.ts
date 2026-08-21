import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"
import { createSourceQueryTarget, getSourceQueryKey } from "./source-query"
import { findCachedSourceResult } from "./use-cached-source-result"

vi.mock("@/lib/source", () => ({
  isSourceRequestProtected: () => false,
  loadSource: vi.fn(),
  SOURCE_QUERY_REFETCH_INTERVAL_MS: 300_000,
  SOURCE_QUERY_STALE_TIME_MS: 60_000,
}))

const source = {
  id: "test:feed",
  version: 2,
  capabilities: { cookies: [], network: [] },
  metadata: { title: "Test feed" },
  provider: { color: "blue", title: "Test" },
} as const

describe("findCachedSourceResult", () => {
  it("resolves the presentation snapshot for an unavailable Source", () => {
    const queryClient = new QueryClient()
    const target = createSourceQueryTarget(source.id, source, {})
    const result = { items: [], source }
    queryClient.setQueryData(getSourceQueryKey(target), result, { updatedAt: 100 })

    expect(findCachedSourceResult(queryClient, source.id, {})).toBe(result)
    expect(findCachedSourceResult(queryClient, "other:feed", {})).toBeUndefined()
  })

  it("ignores legacy cached results that have no Source snapshot", () => {
    const queryClient = new QueryClient()
    const target = createSourceQueryTarget(source.id, source, {})
    queryClient.setQueryData(getSourceQueryKey(target), { items: [] }, { updatedAt: 100 })

    expect(findCachedSourceResult(queryClient, source.id, {})).toBeUndefined()
  })
})
