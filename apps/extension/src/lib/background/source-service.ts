import type {
  NewsItem,
  SourceLoaderMetadata,
} from "@newsnext/source/types"
import {
  normalizeSourceLoaderResult,
  parseSourceId,
  prepareSourceRequest,
} from "@newsnext/source/runtime"
import { resolveSourceSecrets, updateSourceSecrets } from "./source-secrets"

export interface LoadBackgroundSourceInput {
  sourceId: string
  params?: Record<string, unknown>
}

export interface LoadBackgroundSourceOutput {
  items: NewsItem[]
  metadata?: SourceLoaderMetadata
  updatedAt: number
}

export interface BackgroundSourceService {
  load: (input: LoadBackgroundSourceInput) => Promise<LoadBackgroundSourceOutput>
}

export function createBackgroundSourceService(): BackgroundSourceService {
  return {
    async load(input): Promise<LoadBackgroundSourceOutput> {
      const request = await prepareSourceRequest(input.sourceId, input.params ?? {})
      const { provider } = parseSourceId(input.sourceId)
      const secrets = await resolveSourceSecrets(request.source, provider)
      const result = normalizeSourceLoaderResult(
        await request.source.loader(request.params, {
          secrets,
          updateSecrets: async (updates) => {
            Object.assign(secrets, updates)
            await updateSourceSecrets(request.source, provider, updates)
          },
        }),
      )

      return {
        ...result,
        updatedAt: Date.now(),
      }
    },
  }
}
