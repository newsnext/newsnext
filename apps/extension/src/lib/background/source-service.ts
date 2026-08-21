import type {
  RuntimeSource,
} from "@newsnext/source-kit/types"
import type { SourceLoadResult } from "../source/load-result"
import type { BackgroundSourceFetchResult } from "./source-fetch"
import {
  parseSourceId,
  prepareSourceRequest,
} from "@newsnext/source-kit/runtime"
import { createBackgroundSourceFetch } from "./source-fetch"
import { resolveSourceSecrets, updateSourceSecrets } from "./source-secrets"

export interface LoadBackgroundSourceInput {
  requestId?: string
  sourceId: string
  params?: Record<string, unknown>
}

interface BackgroundSourceServiceOptions {
  fetchResults?: BackgroundSourceFetchResult[]
  onRequestPrepared?: (
    params: Record<string, unknown>,
    sourceVersion: number,
    source: RuntimeSource,
  ) => Promise<void> | void
}

export interface CancelBackgroundSourceInput {
  requestId: string
}

export interface BackgroundSourceService {
  cancel: (input: CancelBackgroundSourceInput) => Promise<void>
  load: (input: LoadBackgroundSourceInput) => Promise<SourceLoadResult>
}

export function createBackgroundSourceService(
  options: BackgroundSourceServiceOptions = {},
): BackgroundSourceService {
  const activeRequests = new Map<string, AbortController>()

  return {
    async cancel({ requestId }): Promise<void> {
      activeRequests.get(requestId)?.abort()
    },
    async load(input): Promise<SourceLoadResult> {
      const abortController = new AbortController()
      const { signal } = abortController
      if (input.requestId) {
        activeRequests.set(input.requestId, abortController)
      }

      try {
        const request = await prepareSourceRequest(input.sourceId, input.params ?? {})
        await options.onRequestPrepared?.(
          request.params,
          request.source.version,
          request.source,
        )
        signal.throwIfAborted()
        const { provider } = parseSourceId(input.sourceId)
        const secrets = await resolveSourceSecrets(request.source, provider)
        signal.throwIfAborted()
        const result = await request.source.loader(request.params, {
          fetch: createBackgroundSourceFetch(
            input.sourceId,
            request.source.capabilities.network,
            signal,
            options.fetchResults,
          ),
          secrets,
          signal,
          updateSecrets: async (updates) => {
            Object.assign(secrets, updates)
            await updateSourceSecrets(request.source, provider, updates)
          },
        })

        return {
          ...result,
          source: {
            capabilities: request.source.capabilities,
            id: input.sourceId,
            metadata: request.source.metadata,
            params: request.source.params,
            provider: request.source.provider,
            version: request.source.version,
          },
        }
      } finally {
        if (input.requestId && activeRequests.get(input.requestId) === abortController) {
          activeRequests.delete(input.requestId)
        }
      }
    },
  }
}
