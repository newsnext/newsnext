import type { SourceLoadResponse } from "./load-result"
import {
  normalizeSourceParams,
} from "@newsnext/source-kit/runtime"
import { createId } from "@/lib/id"
import { actions } from "../actions"
import { loadSourceDescriptor } from "./registry"

export type { SourceLoadResponse, SourceLoadResult } from "./load-result"

export async function loadLiveCard(
  cardId: string,
  signal?: AbortSignal,
): Promise<SourceLoadResponse> {
  signal?.throwIfAborted()
  const response = await actions.liveCard.load({ cardId })
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
  const requestId = createId()
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
