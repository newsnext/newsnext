import type { Browser } from "#imports"
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { browser } from "#imports"
import { loadSourceDescriptors } from "@/lib/source"
import { SOURCE_REGISTRIES_STATE_KEY } from "@/lib/source/registry-cache"

export const sourceDescriptorsQueryOptions = queryOptions({
  queryKey: ["source-descriptors"],
  queryFn: loadSourceDescriptors,
  networkMode: "always",
  staleTime: Number.POSITIVE_INFINITY,
})

export function useSourceDescriptors() {
  const queryClient = useQueryClient()
  const query = useQuery(sourceDescriptorsQueryOptions)

  useEffect(() => {
    const handleStorageChange = (
      changes: Record<string, Browser.storage.StorageChange>,
      areaName: string,
    ): void => {
      if (areaName === "local" && changes[SOURCE_REGISTRIES_STATE_KEY]) {
        void queryClient.invalidateQueries({ queryKey: sourceDescriptorsQueryOptions.queryKey })
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
