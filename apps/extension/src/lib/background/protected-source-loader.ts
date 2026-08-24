import type { SourceLoadResponse } from "../source/load-result"
import type { SourceLoaderInvoker } from "./source-loader-invoker"
import { prepareSourceRequest } from "@newsnext/source-kit/runtime"
import { readPersistedSourceResult, writePersistedSourceResult } from "../source/persisted-results"
import { isSourceRequestProtected } from "../source/query-policy"
import { getSourceQueryHash } from "../source/query-target"

export interface ProtectedSourceLoader {
  load: (input: {
    params?: Record<string, unknown>
    requestId?: string
    sourceId: string
  }) => Promise<SourceLoadResponse>
}

export function createProtectedSourceLoader(
  source: SourceLoaderInvoker,
): ProtectedSourceLoader {
  const activeLoads = new Map<string, Promise<SourceLoadResponse>>()

  return {
    async load(input): Promise<SourceLoadResponse> {
      const request = await prepareSourceRequest(input.sourceId, input.params ?? {})
      const target = {
        params: request.params,
        sourceId: input.sourceId,
        version: request.source.version,
      }
      const queryHash = getSourceQueryHash(target)
      const persisted = await readPersistedSourceResult(target)
      if (persisted && isSourceRequestProtected(persisted.fetchedAt)) {
        return {
          fetchProtected: true,
          fetchedAt: persisted.fetchedAt,
          loadedAt: Date.now(),
          params: target.params,
          result: persisted.result,
        }
      }

      const activeLoad = activeLoads.get(queryHash)
      if (activeLoad) {
        const result = await activeLoad
        return { ...result, fetchProtected: true, loadedAt: Date.now() }
      }

      const load = (async (): Promise<SourceLoadResponse> => {
        const result = await source.invoke({
          params: target.params,
          requestId: input.requestId,
          source: request.source,
          sourceId: target.sourceId,
        })
        const fetchedAt = Date.now()
        await writePersistedSourceResult(target, result, fetchedAt)
        return {
          fetchProtected: false,
          fetchedAt,
          loadedAt: Date.now(),
          params: target.params,
          result,
        }
      })()
      activeLoads.set(queryHash, load)
      try {
        return await load
      } finally {
        if (activeLoads.get(queryHash) === load) activeLoads.delete(queryHash)
      }
    },
  }
}
