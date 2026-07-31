import type { SourceQueryTarget } from "./source-query"
import { normalizeSourceParams } from "@newsnext/source/runtime"
import { useIsFetching, useQueryClient } from "@tanstack/react-query"
import { useStore } from "jotai"
import { useCallback, useSyncExternalStore } from "react"
import { buildSourceCards } from "@/lib/source-cards"
import { loadSourceDescriptors } from "@/lib/sources"
import { currentBoardIdAtom, instancesAtom } from "@/store/board"
import {
  getSourceQueryHash,
  getSourceQueryKey,
  refreshSourceQuery,
  SOURCE_QUERY_KEY,
} from "./source-query"

const activeSourceRefreshCounts = new Map<string, number>()
const sourceRefreshListeners = new Set<() => void>()

function updateActiveSourceRefreshes(keys: string[], delta: 1 | -1): void {
  if (keys.length === 0) {
    return
  }

  keys.forEach((key) => {
    const nextCount = (activeSourceRefreshCounts.get(key) ?? 0) + delta
    if (nextCount > 0) {
      activeSourceRefreshCounts.set(key, nextCount)
    } else {
      activeSourceRefreshCounts.delete(key)
    }
  })
  sourceRefreshListeners.forEach(listener => listener())
}

function subscribeToSourceRefreshes(listener: () => void): () => void {
  sourceRefreshListeners.add(listener)
  return () => sourceRefreshListeners.delete(listener)
}

export function useIsSourceRefreshing(refreshKey: string): boolean {
  return useSyncExternalStore(
    subscribeToSourceRefreshes,
    () => activeSourceRefreshCounts.has(refreshKey),
    () => false,
  )
}

async function withSourceRefreshTracking<T>(
  refreshKeys: string[],
  refresh: () => Promise<T>,
): Promise<T> {
  updateActiveSourceRefreshes(refreshKeys, 1)
  try {
    return await refresh()
  } finally {
    updateActiveSourceRefreshes(refreshKeys, -1)
  }
}

export function useSourceRefetch() {
  const queryClient = useQueryClient()

  return useCallback(
    async (...targets: SourceQueryTarget[]) => {
      const uniqueTargets = [...new Map(
        targets.map(target => [getSourceQueryHash(target), target]),
      ).values()]
      const activeTargets = uniqueTargets.filter(target =>
        queryClient.getQueryCache().find({
          queryKey: getSourceQueryKey(target),
          exact: true,
        })?.isActive(),
      )
      const refreshKeys = activeTargets.map(getSourceQueryHash)

      await withSourceRefreshTracking(refreshKeys, async () => {
        const results = await Promise.allSettled(
          activeTargets.map(target => refreshSourceQuery(queryClient, target)),
        )

        results.forEach((result) => {
          if (result.status === "rejected") {
            console.error("Failed to refresh source", result.reason)
          }
        })
      })
    },
    [queryClient],
  )
}

export function useRefetch() {
  const store = useStore()
  const refetchSources = useSourceRefetch()
  const fetchingCount = useIsFetching({ queryKey: SOURCE_QUERY_KEY })

  const isFetching = fetchingCount > 0

  /**
   * Refresh all cards in the current board.
   */
  const refetchAll = useCallback(async () => {
    try {
      const instances = store.get(instancesAtom)
      const currentBoardId = store.get(currentBoardIdAtom)
      const sources = await loadSourceDescriptors()
      const cards = buildSourceCards({
        sources,
        sourceInstances: instances,
        boardId: currentBoardId,
      })
      const targets = cards.ids.map((id) => {
        const source = cards.map[id]
        return {
          sourceId: source.sourceId,
          params: normalizeSourceParams(source, source.paramsValue ?? {}),
        } satisfies SourceQueryTarget
      })
      await refetchSources(...targets)
    } catch (e) {
      console.error("Failed to refresh cards", e)
    }
  }, [refetchSources, store])

  return {
    refetchAll,
    isFetching,
  }
}
