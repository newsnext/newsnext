import type { SourceLoadResponse, SourceLoadResult } from "../source/load-result"
import type { SourceSnapshotTarget } from "../source/source-snapshot"
import type { SourceLoaderInvoker } from "./source-loader-invoker"
import { prepareSourceRequest } from "@newsnext/source-kit/runtime"
import { toLoadedSourceDescriptor } from "../source/load-result"
import { isSourceRequestProtected } from "../source/query-policy"
import { getSourceQueryHash } from "../source/query-target"
import { readSourceResultSnapshot, writeSourceResultSnapshot } from "../source/source-snapshot"

export interface ProtectedSourceLoader {
  load: (input: {
    params?: Record<string, unknown>
    requestId?: string
    sourceId: string
  }) => Promise<SourceLoadResponse>
}

const activeSnapshotLoads = new Map<string, Promise<SourceLoadResponse>>()

/**
 * Execute a Source through the shared snapshot store. Snapshot identity is
 * the Source ID, Source version, and normalized parameters, so the version
 * alone controls snapshot isolation: matching versions share records while a
 * version bump starts a separate record immediately. Protected snapshots are
 * returned without executing. Concurrent executions of one identity are
 * deduplicated. This never retains to history; history retention stays with
 * the LiveCard load paths.
 */
export async function executeSourceSnapshot(
  target: SourceSnapshotTarget,
  source: SourceLoadResult["source"],
  execute: () => Promise<SourceLoadResult>,
): Promise<SourceLoadResponse> {
  const queryHash = getSourceQueryHash(target)
  const snapshot = await readSourceResultSnapshot(target)
  if (snapshot && isSourceRequestProtected(snapshot.fetchedAt)) {
    return {
      fetchProtected: true,
      fetchedAt: snapshot.fetchedAt,
      loadedAt: Date.now(),
      params: target.params,
      result: { ...snapshot.result, source },
    }
  }

  const activeLoad = activeSnapshotLoads.get(queryHash)
  if (activeLoad) {
    const result = await activeLoad
    return { ...result, fetchProtected: true, loadedAt: Date.now() }
  }

  const load = (async (): Promise<SourceLoadResponse> => {
    const result = await execute()
    const fetchedAt = Date.now()
    const { source: _source, ...loaderResult } = result
    await writeSourceResultSnapshot(target, loaderResult, fetchedAt)
    return {
      fetchProtected: false,
      fetchedAt,
      loadedAt: Date.now(),
      params: target.params,
      result,
    }
  })()
  activeSnapshotLoads.set(queryHash, load)
  try {
    return await load
  } finally {
    if (activeSnapshotLoads.get(queryHash) === load) activeSnapshotLoads.delete(queryHash)
  }
}

export function createProtectedSourceLoader(
  source: SourceLoaderInvoker,
): ProtectedSourceLoader {
  return {
    async load(input): Promise<SourceLoadResponse> {
      const request = await prepareSourceRequest(input.sourceId, input.params ?? {})
      return executeSourceSnapshot(
        {
          params: request.params,
          sourceId: input.sourceId,
          version: request.source.version,
        },
        toLoadedSourceDescriptor(request.source, input.sourceId),
        () => source.invoke({
          params: request.params,
          requestId: input.requestId,
          source: request.source,
          sourceId: input.sourceId,
        }),
      )
    },
  }
}
