import { queryOptions, useQuery } from "@tanstack/react-query"
import { loadSourceDescriptors } from "@/lib/source"

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
