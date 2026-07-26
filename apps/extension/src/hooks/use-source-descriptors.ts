import type { Browser } from "#imports"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { browser } from "#imports"
import {
  REGISTRY_CACHE_STORAGE_KEY,
  REGISTRY_URLS_STORAGE_KEY,
} from "@/lib/registry-settings"
import { loadSourceDescriptors } from "@/lib/sources"

export const SOURCE_DESCRIPTORS_QUERY_KEY = ["source-descriptors"] as const

export function useSourceDescriptors() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: SOURCE_DESCRIPTORS_QUERY_KEY,
    queryFn: loadSourceDescriptors,
    staleTime: Number.POSITIVE_INFINITY,
  })

  useEffect(() => {
    const handleStorageChange = (
      changes: Record<string, Browser.storage.StorageChange>,
      areaName: string,
    ): void => {
      if (
        areaName === "local"
        && (
          REGISTRY_URLS_STORAGE_KEY in changes
          || REGISTRY_CACHE_STORAGE_KEY in changes
        )
      ) {
        void queryClient.invalidateQueries({ queryKey: SOURCE_DESCRIPTORS_QUERY_KEY })
      }
    }

    browser.storage.onChanged.addListener(handleStorageChange)
    return () => browser.storage.onChanged.removeListener(handleStorageChange)
  }, [queryClient])

  return {
    ...query,
    sources: query.data ?? [],
  }
}
