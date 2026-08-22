import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"
import {
  fetchLatestSourceQuery,
  getSourceQueryKey,
} from "./source-query"

vi.mock("@/lib/source", () => ({
  isSourceRequestProtected: (updatedAt: number) => Date.now() - updatedAt < 60_000,
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

  it("keeps the original update time when Fetch Latest is protected", async () => {
    const queryClient = new QueryClient()
    const target = {
      params: {},
      sourceId: "github:trending",
      version: 3,
    }
    const queryKey = getSourceQueryKey(target)
    const data = {
      items: [],
    }
    const dataUpdatedAt = Date.now() - 10_000
    queryClient.setQueryData(queryKey, data, { updatedAt: dataUpdatedAt })

    await expect(fetchLatestSourceQuery(queryClient, target)).resolves.toBe(data)
    expect(queryClient.getQueryState(queryKey)?.dataUpdatedAt).toBe(dataUpdatedAt)
  })
})
