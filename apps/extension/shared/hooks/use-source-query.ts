import type { NewsItem } from "@/typings/source"
import { useQuery } from "@tanstack/react-query"
import { getQueryKey } from "@trpc/react-query"
import { useCallback, useEffect } from "react"
import { trpc } from "@/lib/trpc"
import { useLocalStorageCache } from "./use-local-storage-cache"
import { refetchSources, useRefetch } from "./use-refetch"

export interface UseSourceQueryOptions {
  sourceId: string
  enabled?: boolean
}

const STORAGE_PREFIX = "newsnext-source-cache"
export function useSourceQuery({ sourceId, enabled = true }: UseSourceQueryOptions) {
  const utils = trpc.useUtils()
  const { refetch } = useRefetch()
  type SourceData = Awaited<ReturnType<typeof utils.client.getSource.query>>
  const storageKey = `${STORAGE_PREFIX}/${sourceId}`
  const { readCache, writeCache } = useLocalStorageCache<SourceData>(storageKey)

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
    placeholderData: prev => prev ?? readCache(),
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retry: false,
  })

  useEffect(() => {
    if (data) writeCache(data)
  }, [data, writeCache])

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
