import { queryOptions, useQuery } from "@tanstack/react-query"
import { loadSourceDescriptors } from "@/lib/sources"

export const sourceDescriptorsQueryOptions = queryOptions({
  queryKey: ["source-descriptors"],
  queryFn: loadSourceDescriptors,
  networkMode: "always",
  staleTime: Number.POSITIVE_INFINITY,
})

export function useSourceDescriptors() {
  const query = useQuery(sourceDescriptorsQueryOptions)

  return {
    ...query,
    sources: query.data ?? [],
  }
}
