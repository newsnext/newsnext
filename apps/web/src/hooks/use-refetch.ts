import { useIsFetching, useQueryClient } from "@tanstack/react-query"
import { useStore } from "jotai"
import { useCallback } from "react"
import { orpc } from "@/lib/orpc"
import { buildBoardSources, buildSourceRequestKey } from "@/lib/source-cards"
import { getSavedSourceParamValues } from "@/lib/source-params"
import { boardInstancesAtom, boardStarIdsAtom, currentBoardAtom } from "@/store/board"

const latestSourceRefreshKeys = new Set<string>()

export interface RefetchTarget {
  sourceId: string
  params?: Record<string, unknown>
}

function getLatestSourceRefreshKey(target: RefetchTarget): string {
  return buildSourceRequestKey(target.sourceId, target.params ?? {})
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
              queryKey: orpc.getSource.queryKey({
                input: { sourceId: target.sourceId, params: target.params ?? {} },
              }),
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
  const fetchingCount = useIsFetching({ queryKey: orpc.getSource.key({ type: "query" }) })

  const isFetching = fetchingCount > 0

  /**
   * Refresh all sources in the current board.
   */
  const refetchAll = useCallback(async () => {
    try {
      const currentBoard = store.get(currentBoardAtom)
      const starredInstanceIds = store.get(boardStarIdsAtom(currentBoard))
      const instances = store.get(boardInstancesAtom(currentBoard))
      const sources = await queryClient.ensureQueryData(orpc.getBoard.queryOptions())
      const boardSources = buildBoardSources({
        sources,
        boardId: currentBoard,
        starredSourceInstanceIds: starredInstanceIds,
        sourceInstances: instances,
      })
      const targets = boardSources.ids.map((id) => {
        const source = boardSources.map[id]
        return {
          sourceId: source.sourceId,
          params: source.paramsValue ?? getSavedSourceParamValues(source.id, source.params),
        } satisfies RefetchTarget
      })
      const uniqueTargets = [...new Map(
        targets.map(target => [getLatestSourceRefreshKey(target), target]),
      ).values()]

      uniqueTargets.forEach(markLatestSourceRefresh)

      await Promise.all(
        uniqueTargets.map(target =>
          queryClient.invalidateQueries({
            queryKey: orpc.getSource.queryKey({
              input: { sourceId: target.sourceId, params: target.params ?? {} },
            }),
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
