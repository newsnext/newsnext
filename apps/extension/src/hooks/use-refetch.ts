import { normalizeSourceParams, resolveSource } from "@newsnext/source/service"
import { useIsFetching, useQueryClient } from "@tanstack/react-query"
import { useStore } from "jotai"
import { useCallback } from "react"
import { buildBoardSources } from "@/lib/source-cards"
import { buildSourceCacheKey } from "@/lib/source-loader"
import { sanitizeSourceParamValues } from "@/lib/source-params"
import { getSourceDescriptors } from "@/lib/sources"
import { boardInstancesAtom, boardStarIdsAtom, currentBoardAtom } from "@/store/board"

const latestSourceRefreshKeys = new Set<string>()
export const SOURCE_QUERY_KEY = ["source"] as const

export interface RefetchTarget {
  sourceId: string
  params?: Record<string, unknown>
}

function getLatestSourceRefreshKey(target: RefetchTarget): string {
  const source = resolveSource(target.sourceId)
  const params = normalizeSourceParams(source, target.params ?? {})
  return buildSourceCacheKey(target.sourceId, source.cacheVersion ?? 1, params)
}

function markLatestSourceRefresh(target: RefetchTarget): void {
  latestSourceRefreshKeys.add(getLatestSourceRefreshKey(target))
}

export function consumeLatestSourceRefresh(target: RefetchTarget): boolean {
  const key = getLatestSourceRefreshKey(target)

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
          targets.map(target => [getLatestSourceRefreshKey(target), target]),
        ).values()]

        uniqueTargets.forEach(markLatestSourceRefresh)

        await Promise.all(
          uniqueTargets.map(target =>
            queryClient.invalidateQueries({
              queryKey: [...SOURCE_QUERY_KEY, getLatestSourceRefreshKey(target)],
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
   * Refresh all sources in the current board.
   */
  const refetchAll = useCallback(async () => {
    try {
      const currentBoard = store.get(currentBoardAtom)
      const starredInstanceIds = store.get(boardStarIdsAtom(currentBoard))
      const instances = store.get(boardInstancesAtom(currentBoard))
      const sources = getSourceDescriptors()
      const boardSources = buildBoardSources({
        sources,
        boardId: currentBoard,
        starredSourceInstanceIds: starredInstanceIds,
        sourceInstances: instances,
        isLocalOnly: true,
      })
      const targets = boardSources.ids.map((id) => {
        const source = boardSources.map[id]
        return {
          sourceId: source.sourceId,
          params: sanitizeSourceParamValues(source.paramsValue, source.params),
        } satisfies RefetchTarget
      })
      const uniqueTargets = [...new Map(
        targets.map(target => [getLatestSourceRefreshKey(target), target]),
      ).values()]

      uniqueTargets.forEach(markLatestSourceRefresh)

      await Promise.all(
        uniqueTargets.map(target =>
          queryClient.invalidateQueries({
            queryKey: [...SOURCE_QUERY_KEY, getLatestSourceRefreshKey(target)],
          }),
        ),
      )
    } catch (e) {
      console.error("Failed to refresh board sources", e)
    }
  }, [queryClient, store])

  return {
    refetch,
    refetchAll,
    isFetching,
  }
}
