import type { SourceLoadResponse } from "./load-result"
import {
  normalizeSourceParams,
} from "@newsnext/source-kit/runtime"
import { actions } from "../actions"
import { writePersistedSourceResult } from "./persisted-results"
import { loadSourceDescriptor } from "./registry"

export type { SourceLoadResponse, SourceLoadResult } from "./load-result"

export async function loadSource(
  sourceId: string,
  queryParams: Record<string, unknown> = {},
  {
    signal,
    instanceId,
    remote = false,
  }: { signal?: AbortSignal, instanceId?: string, remote?: boolean } = {},
): Promise<SourceLoadResponse> {
  signal?.throwIfAborted()
  if (remote) {
    if (!instanceId) throw new Error("A remote Source load requires an Instance ID")
    const response = await actions.sourceConnection.loadInstance({ instanceId })
    signal?.throwIfAborted()
    return response
  }

  const source = await loadSourceDescriptor(sourceId)
  const params = normalizeSourceParams(source, queryParams)
  signal?.throwIfAborted()
  const response = await loadFreshSource(sourceId, params, signal)
  signal?.throwIfAborted()
  if (instanceId) {
    await writePersistedSourceResult({
      instanceId,
      params,
      sourceId,
      version: source.version,
    }, response.result, response.fetchedAt)
  }
  return response
}

async function loadFreshSource(
  sourceId: string,
  queryParams: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<SourceLoadResponse> {
  const requestId = crypto.randomUUID()
  const cancelRequest = () => {
    void actions.source.cancel({ requestId }).catch(() => undefined)
  }
  signal?.addEventListener("abort", cancelRequest, { once: true })

  try {
    signal?.throwIfAborted()
    const result = await actions.source.load({
      requestId,
      sourceId,
      params: queryParams,
    })

    signal?.throwIfAborted()
    return result
  } finally {
    signal?.removeEventListener("abort", cancelRequest)
  }
}
