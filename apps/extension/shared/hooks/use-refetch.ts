import { useAtomValue } from "jotai"
import { useCallback, useState } from "react"
import { refetchSources } from "@/lib/refetch-state"
import { trpc } from "@/lib/trpc"
import { currentBoardAtom } from "@/store/board"

export function useRefetch() {
  const utils = trpc.useUtils()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const currentBoard = useAtomValue(currentBoardAtom)

  /**
   * Force refresh specific sources
   */
  const refresh = useCallback(
    async (...sourceIds: string[]) => {
      if (isRefreshing) return
      setIsRefreshing(true)
      try {
        // Set flags
        sourceIds.forEach(id => refetchSources.add(id))

        // Invalidate queries to trigger refetch
        await Promise.all(
          sourceIds.map(sourceId =>
            utils.getSource.invalidate({ sourceId }),
          ),
        )
      } finally {
        setIsRefreshing(false)
      }
    },
    [utils, isRefreshing],
  )

  /**
   * Refresh all sources in current board
   */
  const refreshAll = useCallback(async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
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
    } finally {
      setIsRefreshing(false)
    }
  }, [utils, currentBoard, isRefreshing])

  return {
    refresh,
    refreshAll,
    isRefreshing,
  }
}
