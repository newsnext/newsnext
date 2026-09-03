import type { SourceLoadResponse } from "./load-result"
import {
  normalizeSourceParams,
} from "@newsnext/source-kit/runtime"
import { actions } from "../actions"
import { loadSourceDescriptor } from "./registry"

export type { SourceLoadResponse, SourceLoadResult } from "./load-result"

export async function loadInstance(
  instanceId: string,
  signal?: AbortSignal,
): Promise<SourceLoadResponse> {
  signal?.throwIfAborted()
  const response = await actions.instance.load({ instanceId })
  signal?.throwIfAborted()
  return response
}

export async function loadSource(
  sourceId: string,
  queryParams: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<SourceLoadResponse> {
  signal?.throwIfAborted()
  const source = await loadSourceDescriptor(sourceId)
  const params = normalizeSourceParams(source, queryParams)
  signal?.throwIfAborted()
  const response = await loadFreshSource(sourceId, params, signal)
  signal?.throwIfAborted()
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
