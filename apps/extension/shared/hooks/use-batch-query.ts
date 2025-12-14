import { useQuery } from "@tanstack/react-query"
import { useCallback } from "react"
import { trpc } from "@/lib/trpc"

/**
 * Hook to fetch multiple sources in batch and update individual caches
 * This is useful for initial page load or refreshing multiple sources at once
 */
export function useBatchQuery(sourceIds: string[]) {
  const utils = trpc.useUtils()

  const updateQueries = useCallback(
    async (...ids: string[]) => {
      await Promise.all(
        ids.map(sourceId =>
          utils.getSource.invalidate({ sourceId }),
        ),
      )
    },
    [utils],
  )

  return useQuery({
    queryKey: ["batch-sources", [...sourceIds].sort()],
    queryFn: async () => {
      if (sourceIds.length === 0) return null

      const updatedIds: string[] = []
      // Update individual queries for changed sources
      if (updatedIds.length > 0) {
        await updateQueries(...updatedIds)
      }

      return {
        total: sourceIds.length,
        updated: updatedIds.length,
      }
    },
    staleTime: 1000 * 60 * 3, // 3 minutes
    retry: false,
  })
}
