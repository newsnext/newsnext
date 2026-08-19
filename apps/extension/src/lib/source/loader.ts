import type { SourceLoaderResult } from "@newsnext/source-kit/types"
import {
  normalizeSourceParams,
} from "@newsnext/source-kit/runtime"
import { createBackgroundClient } from "../background/client"
import { loadSourceDescriptor } from "./registry"

export type SourceLoadResult = SourceLoaderResult

export async function loadSource(
  sourceId: string,
  queryParams: Record<string, unknown> = {},
  { signal }: { signal?: AbortSignal } = {},
): Promise<SourceLoadResult> {
  signal?.throwIfAborted()
  const source = await loadSourceDescriptor(sourceId)
  const params = normalizeSourceParams(source, queryParams)
  signal?.throwIfAborted()
  return loadFreshSource(sourceId, params, signal)
}

async function loadFreshSource(
  sourceId: string,
  queryParams: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<SourceLoadResult> {
  const client = createBackgroundClient()
  const requestId = crypto.randomUUID()
  const cancelRequest = () => {
    void client.source.cancel({ requestId }).catch(() => undefined)
  }
  signal?.addEventListener("abort", cancelRequest, { once: true })

  try {
    signal?.throwIfAborted()
    const result = await client.source.load({
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
