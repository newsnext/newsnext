import type { QueryClient } from "@tanstack/react-query"
import type { SourceLoadResponse, SourceLoadResult } from "@/lib/source/load-result"
import {
  createSourceQueryTarget,
  getSourceQueryHash,
  SOURCE_QUERY_KEY,
} from "@/hooks/source-query"

interface SourceSnapshotQuery {
  data: SourceLoadResult
  loadedAt: number
}

function getSourceLoadResponse(
  value: unknown,
): Partial<SourceLoadResponse> | undefined {
  if (typeof value !== "object" || value === null) return undefined
  return value
}

function readSourceSnapshotQuery(
  value: unknown,
  sourceId: string,
): SourceSnapshotQuery | undefined {
  const response = getSourceLoadResponse(value)
  const result = response?.result
  if (
    !result
    || result.source?.id !== sourceId
    || typeof response.loadedAt !== "number"
  ) {
    return undefined
  }
  return { data: result, loadedAt: response.loadedAt }
}

export function findSourceSnapshot(
  queryClient: QueryClient,
  sourceId: string,
  params: Record<string, unknown> | undefined,
): SourceSnapshotQuery | undefined {
  const queries = queryClient.getQueryCache()
    .findAll({ queryKey: SOURCE_QUERY_KEY })
    .filter(query => query.state.data !== undefined)

  for (const query of queries) {
    const snapshot = readSourceSnapshotQuery(query.state.data, sourceId)
    if (!snapshot) continue
    const target = createSourceQueryTarget(sourceId, snapshot.data.source, params)
    // Compare hashes, not keys: normalized targets with equal semantics can serialize to different key arrays.
    if (query.queryHash === getSourceQueryHash(target)) {
      return snapshot
    }
  }
}
