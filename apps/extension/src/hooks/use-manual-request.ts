import type { InvalidateQueryFilters, QueryFilters } from "@tanstack/react-query"
import type { SourceQueryTarget } from "./source-query"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useSyncExternalStore } from "react"
import { waitForMinimumManualRequestFeedback } from "@/lib/manual-request-feedback"
import {
  getSourceQueryHash,
  LIVE_CARD_QUERY_KEY,
  SOURCE_QUERY_KEY,
} from "./source-query"

export const LIVE_WIDGET_QUERY_KEY = ["live-widget"] as const

const activeManualRequestCounts = new Map<string, number>()
const activeManualRequestGroups = new Map<string, number>()
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

async function withManualRequestTracking(
  queryHashes: string[],
  manualRequest: () => Promise<void>,
  group?: string,
): Promise<void> {
  const startedAt = Date.now()
  updateActiveManualRequests(queryHashes, 1)
  if (group) {
    activeManualRequestGroups.set(group, (activeManualRequestGroups.get(group) ?? 0) + 1)
    manualRequestListeners.forEach(listener => listener())
  }
  try {
    await manualRequest()
  } finally {
    await waitForMinimumManualRequestFeedback(startedAt)
    updateActiveManualRequests(queryHashes, -1)
    if (group) {
      const count = (activeManualRequestGroups.get(group) ?? 1) - 1
      if (count > 0) activeManualRequestGroups.set(group, count)
      else activeManualRequestGroups.delete(group)
      manualRequestListeners.forEach(listener => listener())
    }
  }
}

export async function runManualRequest(manualRequest: () => Promise<unknown>): Promise<void> {
  const startedAt = Date.now()
  try {
    await manualRequest()
  } finally {
    await waitForMinimumManualRequestFeedback(startedAt)
  }
}

export function useIsManualRequestingGroup(group: string): boolean {
  return useSyncExternalStore(
    subscribeToManualRequests,
    () => (activeManualRequestGroups.get(group) ?? 0) > 0,
    () => false,
  )
}

export function getWidgetManualRequestGroup(boardId: string): string {
  return `live-widgets:${boardId}`
}

export function useManualRequestSources() {
  const queryClient = useQueryClient()

  return useCallback(
    async (...targets: SourceQueryTarget[]) => {
      const targetHashes = new Set(targets.map(getSourceQueryHash))
      const filters: QueryFilters = {
        type: "active",
        predicate: query => isLoadQuery(query.queryKey)
          && (targetHashes.size === 0 || targetHashes.has(query.queryHash)),
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

export function useManualRequestLiveCards(cardIds: readonly string[]) {
  const queryClient = useQueryClient()

  return useCallback(async () => {
    const cardIdsSet = new Set(cardIds)
    const filters: QueryFilters = {
      predicate: query => query.queryKey[0] === LIVE_CARD_QUERY_KEY[0]
        && typeof query.queryKey[1] === "string"
        && cardIdsSet.has(query.queryKey[1]),
    }
    const activeQueries = queryClient.getQueryCache().findAll({ ...filters, type: "active" })
    await withManualRequestTracking(
      activeQueries.map(query => query.queryHash),
      () => queryClient.invalidateQueries({
        ...filters,
        refetchType: "active",
      } satisfies InvalidateQueryFilters),
      `live-cards:${[...cardIds].sort().join(",")}`,
    )
  }, [cardIds, queryClient])
}

export function useManualRequestWidgets(boardId: string | undefined) {
  const queryClient = useQueryClient()

  return useCallback(async () => {
    if (!boardId) return
    const filters: QueryFilters = {
      predicate: query => query.queryKey[0] === LIVE_WIDGET_QUERY_KEY[0]
        && query.queryKey[1] === boardId,
    }
    const activeQueries = queryClient.getQueryCache().findAll({ ...filters, type: "active" })
    await withManualRequestTracking(
      activeQueries.map(query => query.queryHash),
      () => queryClient.invalidateQueries({
        ...filters,
        refetchType: "active",
      } satisfies InvalidateQueryFilters),
      getWidgetManualRequestGroup(boardId),
    )
  }, [boardId, queryClient])
}

function isLoadQuery(queryKey: readonly unknown[]): boolean {
  return queryKey[0] === SOURCE_QUERY_KEY[0] || queryKey[0] === LIVE_CARD_QUERY_KEY[0]
}
