import type {
  RuntimeSource,
} from "@newsnext/source-kit/types"
import type { SourceLoadResult } from "../source/load-result"
import type { BackgroundSourceFetchResult } from "./source-fetch"
import {
  parseSourceId,
} from "@newsnext/source-kit/runtime"
import { createBackgroundSourceFetch } from "./source-fetch"
import { resolveSourceSecrets, updateSourceSecrets } from "./source-secrets"

export interface InvokeSourceLoaderInput {
  requestId?: string
  params: Record<string, unknown>
  source: RuntimeSource
  sourceId: string
}

interface SourceLoaderInvokerOptions {
  fetchResults?: BackgroundSourceFetchResult[]
}

export interface CancelBackgroundSourceInput {
  requestId: string
}

export interface SourceLoaderInvoker {
  cancel: (input: CancelBackgroundSourceInput) => Promise<void>
  invoke: (input: InvokeSourceLoaderInput) => Promise<SourceLoadResult>
}

export function createSourceLoaderInvoker(
  options: SourceLoaderInvokerOptions = {},
): SourceLoaderInvoker {
  const activeRequests = new Map<string, AbortController>()

  return {
    async cancel({ requestId }): Promise<void> {
      activeRequests.get(requestId)?.abort()
    },
    async invoke(input): Promise<SourceLoadResult> {
      const abortController = new AbortController()
      const { signal } = abortController
      if (input.requestId) {
        activeRequests.set(input.requestId, abortController)
      }

      try {
        signal.throwIfAborted()
        const { provider } = parseSourceId(input.sourceId)
        const secrets = await resolveSourceSecrets(input.source, provider)
        signal.throwIfAborted()
        const result = await input.source.loader(input.params, {
          fetch: createBackgroundSourceFetch(
            input.sourceId,
            input.source.capabilities.network,
            signal,
            options.fetchResults,
          ),
          secrets,
          signal,
          updateSecrets: async (updates) => {
            Object.assign(secrets, updates)
            await updateSourceSecrets(input.source, provider, updates)
          },
        })

        return {
          ...result,
          source: {
            capabilities: input.source.capabilities,
            id: input.sourceId,
            metadata: input.source.metadata,
            params: input.source.params,
            provider: input.source.provider,
            version: input.source.version,
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
