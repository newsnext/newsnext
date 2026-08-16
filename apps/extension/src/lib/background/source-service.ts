import type {
  SourceLoaderResult,
} from "@newsnext/source/types"
import type { BackgroundSourceFetchResult } from "./source-fetch"
import {
  parseSourceId,
  prepareSourceRequest,
} from "@newsnext/source/runtime"
import { createBackgroundSourceFetch } from "./source-fetch"
import { resolveSourceSecrets, updateSourceSecrets } from "./source-secrets"

export interface LoadBackgroundSourceInput {
  requestId?: string
  sourceId: string
  params?: Record<string, unknown>
}

interface BackgroundSourceServiceOptions {
  fetchResults?: BackgroundSourceFetchResult[]
  onRequestPrepared?: (params: Record<string, unknown>, sourceVersion: number) => void
}

export interface CancelBackgroundSourceInput {
  requestId: string
}

export interface LoadBackgroundSourceOutput extends SourceLoaderResult {
  updatedAt: number
}

export interface BackgroundSourceService {
  cancel: (input: CancelBackgroundSourceInput) => Promise<void>
  load: (input: LoadBackgroundSourceInput) => Promise<LoadBackgroundSourceOutput>
}

export function createBackgroundSourceService(
  options: BackgroundSourceServiceOptions = {},
): BackgroundSourceService {
  const activeRequests = new Map<string, AbortController>()

  return {
    async cancel({ requestId }): Promise<void> {
      activeRequests.get(requestId)?.abort()
    },
    async load(input): Promise<LoadBackgroundSourceOutput> {
      const abortController = new AbortController()
      const { signal } = abortController
      if (input.requestId) {
        activeRequests.set(input.requestId, abortController)
      }

      try {
        const request = await prepareSourceRequest(input.sourceId, input.params ?? {})
        options.onRequestPrepared?.(request.params, request.source.cache.version)
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
          updatedAt: Date.now(),
        }
      } finally {
        if (input.requestId && activeRequests.get(input.requestId) === abortController) {
          activeRequests.delete(input.requestId)
        }
      }
    },
  }
}
