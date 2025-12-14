import type { NewsItem } from "@/typings/source"
import { useCallback } from "react"
import { trpc } from "@/lib/trpc"

export interface UseSourceQueryOptions {
  sourceId: string
  enabled?: boolean
}

export function useSourceQuery({ sourceId, enabled = true }: UseSourceQueryOptions) {
  const { data, refetch, isFetching, isError } = trpc.getSource.useQuery(
    { sourceId },
    {
      enabled,
      placeholderData: prev => prev,
      staleTime: Number.POSITIVE_INFINITY,
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      retry: false,
    },
  )

  const forceRefresh = useCallback(() => {
    refetch()
  }, [sourceId, refetch])

  return {
    data,
    items: (data?.items || []) as NewsItem[],
    refetch: forceRefresh,
    isFetching,
    isError,
    updatedTime: data?.updated,
  }
}
