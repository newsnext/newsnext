import type { SourceQueryTarget } from "./source-query"
import { useIsFetching, useQueryClient } from "@tanstack/react-query"
import { useStore } from "jotai"
import { useCallback, useSyncExternalStore } from "react"
import { buildLiveCards, FETCH_LATEST_MINIMUM_FEEDBACK_MS, loadSourceDescriptors } from "@/lib/source"
import { collectionEntriesAtom, instancesAtom } from "@/store/board"
import { currentBoardIdAtom } from "@/store/settings"
import {
  createSourceQueryTarget,
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

function useIsFetchingLatest(): boolean {
  return useSyncExternalStore(
    subscribeToFetchLatest,
    () => activeFetchLatestCounts.size > 0,
    () => false,
  )
}

async function waitForMinimumFetchLatestFeedback(startedAt: number): Promise<void> {
  const remainingMs = FETCH_LATEST_MINIMUM_FEEDBACK_MS - (Date.now() - startedAt)
  if (remainingMs <= 0) {
    return
  }

  await new Promise(resolve => setTimeout(resolve, remainingMs))
}

async function withFetchLatestTracking(
  queryHashes: string[],
  fetchLatest: () => Promise<void>,
): Promise<void> {
  if (queryHashes.length === 0) {
    await fetchLatest()
    return
  }

  const startedAt = Date.now()
  updateActiveFetchLatest(queryHashes, 1)
  try {
    await fetchLatest()
  } finally {
    await waitForMinimumFetchLatestFeedback(startedAt)
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
  const isFetchingLatest = useIsFetchingLatest()

  const isFetching = fetchingCount > 0 || isFetchingLatest

  const fetchLatest = useCallback(async () => {
    try {
      const instances = store.get(instancesAtom)
      const collectionEntries = store.get(collectionEntriesAtom)
      const currentBoardId = store.get(currentBoardIdAtom)
      const sources = await loadSourceDescriptors()
      const targets = buildLiveCards({
        sources,
        sourceInstances: instances,
        collectionId: currentBoardId,
        collectionInstanceIds: collectionEntries
          .filter(entry => entry.collectionId === currentBoardId)
          .map(entry => entry.instanceId),
      }).map(liveCard => createSourceQueryTarget(
        liveCard.sourceId,
        liveCard,
        liveCard.paramsValue,
      ))
      await fetchLatestSources(...targets)
    } catch (e) {
      console.error("Failed to fetch latest LiveCards", e)
    }
  }, [fetchLatestSources, store])

  return {
    fetchLatest,
    isFetching,
  }
}
