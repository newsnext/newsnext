import type { SourceQueryTarget } from "./source-query"
import { normalizeSourceParams } from "@newsnext/source/runtime"
import { useIsFetching, useQueryClient } from "@tanstack/react-query"
import { useStore } from "jotai"
import { useCallback, useSyncExternalStore } from "react"
import { buildSourceCards } from "@/lib/source-cards"
import { loadSourceDescriptors } from "@/lib/sources"
import { currentBoardIdAtom, instancesAtom } from "@/store/board"
import {
  fetchLatestSourceQuery,
  getSourceQueryHash,
  getSourceQueryKey,
  SOURCE_QUERY_KEY,
} from "./source-query"

const activeFetchLatestCounts = new Map<string, number>()
const fetchLatestListeners = new Set<() => void>()

function updateActiveFetchLatest(keys: string[], delta: 1 | -1): void {
  if (keys.length === 0) {
    return
  }

  keys.forEach((key) => {
    const nextCount = (activeFetchLatestCounts.get(key) ?? 0) + delta
    if (nextCount > 0) {
      activeFetchLatestCounts.set(key, nextCount)
    } else {
      activeFetchLatestCounts.delete(key)
    }
  })
  fetchLatestListeners.forEach(listener => listener())
}

function subscribeToFetchLatest(listener: () => void): () => void {
  fetchLatestListeners.add(listener)
  return () => fetchLatestListeners.delete(listener)
}

export function useIsSourceFetchingLatest(queryHash: string): boolean {
  return useSyncExternalStore(
    subscribeToFetchLatest,
    () => activeFetchLatestCounts.has(queryHash),
    () => false,
  )
}

async function withFetchLatestTracking<T>(
  queryHashes: string[],
  fetchLatest: () => Promise<T>,
): Promise<T> {
  updateActiveFetchLatest(queryHashes, 1)
  try {
    return await fetchLatest()
  } finally {
    updateActiveFetchLatest(queryHashes, -1)
  }
}

export function useFetchLatestSources() {
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
      const queryHashes = activeTargets.map(getSourceQueryHash)

      await withFetchLatestTracking(queryHashes, async () => {
        const results = await Promise.allSettled(
          activeTargets.map(target => fetchLatestSourceQuery(queryClient, target)),
        )

        results.forEach((result) => {
          if (result.status === "rejected") {
            console.error("Failed to fetch latest source", result.reason)
          }
        })
      })
    },
    [queryClient],
  )
}

export function useFetchLatest() {
  const store = useStore()
  const fetchLatestSources = useFetchLatestSources()
  const fetchingCount = useIsFetching({ queryKey: SOURCE_QUERY_KEY })

  const isFetching = fetchingCount > 0

  const fetchLatest = useCallback(async () => {
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
      await fetchLatestSources(...targets)
    } catch (e) {
      console.error("Failed to fetch latest cards", e)
    }
  }, [fetchLatestSources, store])

  return {
    fetchLatest,
    isFetching,
  }
}
