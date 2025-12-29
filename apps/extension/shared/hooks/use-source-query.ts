import type { NewsItem } from "@/typings/source"
import { useQuery } from "@tanstack/react-query"
import { getQueryKey } from "@trpc/react-query"
import { useCallback } from "react"
import { trpc } from "@/lib/trpc"
import { refetchSources, useRefetch } from "./use-refetch"

export interface UseSourceQueryOptions {
  sourceId: string
  enabled?: boolean
}

export function useSourceQuery({ sourceId, enabled = true }: UseSourceQueryOptions) {
  const utils = trpc.useUtils()
  const { refetch } = useRefetch()

  const { data, isFetching, isError, refetch: normalRefetch } = useQuery({
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
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const handleRefetch = useCallback(async () => {
    await refetch(sourceId)
  }, [sourceId, refetch])

  return {
    data,
    items: (data?.items || []) as NewsItem[],
    refetch: handleRefetch,
    normalRefetch,
    isFetching,
    isError,
    updatedTime: data?.updated,
  }
}
