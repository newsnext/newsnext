import { useIsFetching } from "@tanstack/react-query"
import { getQueryKey } from "@trpc/react-query"
import { useAtomValue } from "jotai"
import { useCallback, useMemo } from "react"
import { trpc } from "@/lib/trpc"
import { currentBoardAtom } from "@/store/board"

export const refetchSources = new Set<string>()

export function useRefetch() {
  const utils = trpc.useUtils()
  const currentBoard = useAtomValue(currentBoardAtom)
  const fetchingCount = useIsFetching({ queryKey: getQueryKey(trpc.getSource) })

  const isFetching = useMemo(() => fetchingCount > 0, [fetchingCount])

  /**
   * Force refresh specific sources
   */
  const refetch = useCallback(
    async (...sourceIds: string[]) => {
      try {
        // Set flags
        sourceIds.forEach(id => refetchSources.add(id))

        // Invalidate queries to trigger refetch
        await Promise.all(
          sourceIds.map(sourceId =>
            utils.getSource.invalidate({ sourceId }),
          ),
        )
      } catch (e) {
        console.error("Failed to refresh sources", e)
      }
    },
    [utils],
  )

  /**
   * Refresh all sources in current board
   */
  const refetchAll = useCallback(async () => {
    try {
      // 1. Get current board's sources
      const sources = await utils.getBoard.ensureData({ boardId: currentBoard })
      const sourceIds = sources.map(s => s.namespace ? `${s.namespace}:${s.id}` : s.id)

      // 2. Set flags
      sourceIds.forEach(id => refetchSources.add(id))

      // 3. Invalidate queries to trigger refetch
      await Promise.all(
        sourceIds.map(sourceId =>
          utils.getSource.invalidate({ sourceId }),
        ),
      )
    } catch (e) {
      console.error("Failed to refresh board sources", e)
    }
  }, [utils, currentBoard])

  return {
    refetch,
    refetchAll,
    isFetching,
  }
}
