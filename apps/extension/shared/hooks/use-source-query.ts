import type { NewsItem } from "@/typings/source"
import { useQuery } from "@tanstack/react-query"
import { getQueryKey } from "@trpc/react-query"
import { useCallback } from "react"
import { refetchSources } from "@/lib/refetch-state"
import { trpc } from "@/lib/trpc"

export interface UseSourceQueryOptions {
  sourceId: string
  enabled?: boolean
}

export function useSourceQuery({ sourceId, enabled = true }: UseSourceQueryOptions) {
  const utils = trpc.useUtils()

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: getQueryKey(trpc.getSource, { sourceId }),
    queryFn: async () => {
      const isRefetch = refetchSources.has(sourceId)
      if (isRefetch) {
        refetchSources.delete(sourceId)
        return utils.client.getSource.query({ sourceId, latest: true })
      }
      return utils.client.getSource.query({ sourceId })
    },
    enabled,
    placeholderData: prev => prev,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    retry: false,
  })

  const forceRefresh = useCallback(async () => {
    refetchSources.add(sourceId)
    await refetch()
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
