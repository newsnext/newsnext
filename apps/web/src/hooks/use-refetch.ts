import { useIsFetching, useQueryClient } from "@tanstack/react-query"
import { useAtomValue } from "jotai"
import { useCallback } from "react"
import { orpc } from "@/lib/orpc"
import { buildBoardSources, buildSourceRequestKey } from "@/lib/source-cards"
import { getSavedSourceParamValues } from "@/lib/source-params"
import { currentBoardAtom, sourceInstancesAtom, starredSourceInstanceIdsAtom } from "@/store/board"

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
  const currentBoard = useAtomValue(currentBoardAtom)
  const starredSourceInstanceIds = useAtomValue(starredSourceInstanceIdsAtom)
  const sourceInstances = useAtomValue(sourceInstancesAtom)
  const fetchingCount = useIsFetching({ queryKey: orpc.getSource.key({ type: "query" }) })

  const isFetching = fetchingCount > 0

  /**
   * Force refresh specific sources.
   */
  const refetch = useCallback(
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

  /**
   * Refresh all sources in the current board.
   */
  const refetchAll = useCallback(async () => {
    try {
      const sources = await queryClient.ensureQueryData(orpc.getBoard.queryOptions())
      const boardSources = buildBoardSources({
        sources,
        boardId: currentBoard,
        starredSourceInstanceIds,
        sourceInstances,
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
  }, [queryClient, currentBoard, starredSourceInstanceIds, sourceInstances])

  return {
    refetch,
    refetchAll,
    isFetching,
  }
}
