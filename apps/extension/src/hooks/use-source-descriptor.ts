import { queryOptions, useQueries, useQuery } from "@tanstack/react-query"
import { loadSourceDescriptor } from "@/lib/source"

function sourceDescriptorQueryOptions(sourceId: string) {
  return queryOptions({
    queryKey: ["source-descriptor", sourceId],
    queryFn: () => loadSourceDescriptor(sourceId),
    networkMode: "always",
    // Descriptors change only with registry updates; missing definitions stay missing.
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
}

/**
 * On-demand descriptor for one Source. Never blocks rendering: while loading
 * `descriptor` is undefined and callers render a placeholder/snapshot
 * instead. A resolved error means the definition was removed: callers must
 * render an error and never serve snapshot items.
 */
export function useSourceDescriptor(sourceId: string, options?: { enabled?: boolean }) {
  const query = useQuery({
    ...sourceDescriptorQueryOptions(sourceId),
    enabled: options?.enabled ?? true,
  })

  return {
    descriptor: query.data,
    descriptorError: query.error instanceof Error ? query.error : undefined,
    isDescriptorPending: query.isPending,
  }
}

/** On-demand descriptors for a set of Sources (deduped by caller). */
export function useSourceDescriptorMap(sourceIds: readonly string[]) {
  const results = useQueries({
    queries: sourceIds.map(sourceId => sourceDescriptorQueryOptions(sourceId)),
    combine: combined => ({
      descriptors: new Map(
        combined.flatMap((result, index) => {
          const sourceId = sourceIds[index]
          const data = result.data
          return sourceId !== undefined && data !== undefined ? [[sourceId, data] as const] : []
        }),
      ),
      isPending: combined.some(result => result.isPending),
    }),
  })

  return results
}
