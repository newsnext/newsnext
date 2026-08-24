import type { QueryFilters } from "@tanstack/react-query"
import type { SourceQueryTarget } from "./source-query"
import { useIsFetching, useQueryClient } from "@tanstack/react-query"
import { useCallback, useSyncExternalStore } from "react"
import { MANUAL_REQUEST_MINIMUM_FEEDBACK_MS } from "@/lib/source"
import {
  getSourceQueryHash,
  SOURCE_QUERY_KEY,
} from "./source-query"

const activeManualRequestCounts = new Map<string, number>()
const manualRequestListeners = new Set<() => void>()

function updateActiveManualRequests(keys: string[], delta: 1 | -1): void {
  keys.forEach((key) => {
    const nextCount = (activeManualRequestCounts.get(key) ?? 0) + delta
    if (nextCount > 0) {
      activeManualRequestCounts.set(key, nextCount)
    } else {
      activeManualRequestCounts.delete(key)
    }
  })
  manualRequestListeners.forEach(listener => listener())
}

function subscribeToManualRequests(listener: () => void): () => void {
  manualRequestListeners.add(listener)
  return () => manualRequestListeners.delete(listener)
}

export function useIsSourceManualRequesting(queryHash: string): boolean {
  return useSyncExternalStore(
    subscribeToManualRequests,
    () => activeManualRequestCounts.has(queryHash),
    () => false,
  )
}

function useIsManualRequesting(): boolean {
  return useSyncExternalStore(
    subscribeToManualRequests,
    () => activeManualRequestCounts.size > 0,
    () => false,
  )
}

async function waitForMinimumManualRequestFeedback(startedAt: number): Promise<void> {
  const remainingMs = MANUAL_REQUEST_MINIMUM_FEEDBACK_MS - (Date.now() - startedAt)
  if (remainingMs <= 0) {
    return
  }

  await new Promise(resolve => setTimeout(resolve, remainingMs))
}

async function withManualRequestTracking(
  queryHashes: string[],
  manualRequest: () => Promise<void>,
): Promise<void> {
  const startedAt = Date.now()
  updateActiveManualRequests(queryHashes, 1)
  try {
    await manualRequest()
  } finally {
    await waitForMinimumManualRequestFeedback(startedAt)
    updateActiveManualRequests(queryHashes, -1)
  }
}

export function useManualRequestSources() {
  const queryClient = useQueryClient()

  return useCallback(
    async (...targets: SourceQueryTarget[]) => {
      const targetHashes = new Set(targets.map(getSourceQueryHash))
      const filters: QueryFilters = {
        queryKey: SOURCE_QUERY_KEY,
        type: "active",
        ...(targetHashes.size > 0
          ? { predicate: query => targetHashes.has(query.queryHash) }
          : {}),
      }
      const activeQueries = queryClient.getQueryCache().findAll(filters)
      if (activeQueries.length === 0) {
        return
      }

      await withManualRequestTracking(
        activeQueries.map(query => query.queryHash),
        () => queryClient.refetchQueries(filters),
      )
    },
    [queryClient],
  )
}

export function useManualRequest() {
  const manualRequestSources = useManualRequestSources()
  const fetchingCount = useIsFetching({ queryKey: SOURCE_QUERY_KEY })
  const isManualRequesting = useIsManualRequesting()

  const isFetching = fetchingCount > 0 || isManualRequesting

  const manualRequest = useCallback(async () => {
    await manualRequestSources()
  }, [manualRequestSources])

  return {
    manualRequest,
    isFetching,
  }
}
