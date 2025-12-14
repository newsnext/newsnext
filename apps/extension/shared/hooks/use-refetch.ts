import { useCallback, useState } from "react"
import { trpc } from "@/lib/trpc"

export function useRefetch() {
  const utils = trpc.useUtils()
  const [isRefreshing, setIsRefreshing] = useState(false)

  /**
   * Force refresh specific sources
   */
  const refresh = useCallback(
    async (...sourceIds: string[]) => {
      setIsRefreshing(true)
      try {
        // Invalidate and refetch queries
        await Promise.all(
          sourceIds.map(sourceId =>
            utils.getSource.invalidate({ sourceId }),
          ),
        )
      } finally {
        setIsRefreshing(false)
      }
    },
    [utils],
  )

  /**
   * Refresh all sources
   */
  const refreshAll = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await utils.getSource.invalidate()
    } finally {
      setIsRefreshing(false)
    }
  }, [utils])

  return {
    refresh,
    refreshAll,
    isRefreshing,
  }
}
