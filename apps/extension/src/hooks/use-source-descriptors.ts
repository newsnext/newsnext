import { useQuery } from "@tanstack/react-query"
import { loadSourceDescriptors } from "@/lib/sources"

export const SOURCE_DESCRIPTORS_QUERY_KEY = ["source-descriptors"] as const

export function useSourceDescriptors() {
  const query = useQuery({
    queryKey: SOURCE_DESCRIPTORS_QUERY_KEY,
    queryFn: loadSourceDescriptors,
    staleTime: Number.POSITIVE_INFINITY,
  })

  return {
    ...query,
    sources: query.data ?? [],
  }
}
