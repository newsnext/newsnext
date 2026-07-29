import { stableStringify } from "@newsnext/shared/utils"
import { useIsFetching, useQueryClient } from "@tanstack/react-query"
import { useStore } from "jotai"
import { useCallback } from "react"
import { buildSourceCards } from "@/lib/source-cards"
import { sanitizeSourceParamValues } from "@/lib/source-params"
import { loadSourceDescriptors } from "@/lib/sources"
import { currentBoardIdAtom, instancesAtom } from "@/store/board"

const latestSourceRefreshKeys = new Set<string>()
export const SOURCE_QUERY_KEY = ["source"] as const

export interface RefetchTarget {
  sourceId: string
  params?: Record<string, unknown>
}

export function getSourceRefreshKey(target: RefetchTarget): string {
  return `${target.sourceId}:${stableStringify(target.params ?? {})}`
}

function markLatestSourceRefresh(target: RefetchTarget): void {
  latestSourceRefreshKeys.add(getSourceRefreshKey(target))
}

export function consumeLatestSourceRefresh(target: RefetchTarget): boolean {
  const key = getSourceRefreshKey(target)

  if (!latestSourceRefreshKeys.has(key)) {
    return false
  }

  latestSourceRefreshKeys.delete(key)
  return true
}

export function useSourceRefetch() {
  const queryClient = useQueryClient()

  return useCallback(
    async (...targets: RefetchTarget[]) => {
      try {
        const uniqueTargets = [...new Map(
          targets.map(target => [getSourceRefreshKey(target), target]),
        ).values()]

        uniqueTargets.forEach(markLatestSourceRefresh)

        await Promise.all(
          uniqueTargets.map(target =>
            queryClient.invalidateQueries({
              queryKey: [...SOURCE_QUERY_KEY, getSourceRefreshKey(target)],
            }),
          ),
        )
      } catch (e) {
        console.error("Failed to refresh sources", e)
      }
    },
    [queryClient],
  )
}

export function useRefetch() {
  const queryClient = useQueryClient()
  const store = useStore()
  const refetch = useSourceRefetch()
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
          params: sanitizeSourceParamValues(source.paramsValue, source.params),
        } satisfies RefetchTarget
      })
      const uniqueTargets = [...new Map(
        targets.map(target => [getSourceRefreshKey(target), target]),
      ).values()]

      uniqueTargets.forEach(markLatestSourceRefresh)

      await Promise.all(
        uniqueTargets.map(target =>
          queryClient.invalidateQueries({
            queryKey: [...SOURCE_QUERY_KEY, getSourceRefreshKey(target)],
          }),
        ),
      )
    } catch (e) {
      console.error("Failed to refresh cards", e)
    }
  }, [queryClient, store])

  return {
    refetch,
    refetchAll,
    isFetching,
  }
}
