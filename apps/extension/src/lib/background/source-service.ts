import type { NewsItem } from "@newsnext/source/typings"
import { parseSourceId, prepareSourceRequest } from "@newsnext/source/service"
import { resolveSourceSecrets, updateSourceSecrets } from "./source-secrets"

export interface LoadBackgroundSourceInput {
  sourceId: string
  params?: Record<string, unknown>
}

export interface LoadBackgroundSourceOutput {
  items: NewsItem[]
  updatedAt: number
}

export interface BackgroundSourceService {
  load: (input: LoadBackgroundSourceInput) => Promise<LoadBackgroundSourceOutput>
}

export function createBackgroundSourceService(): BackgroundSourceService {
  return {
    async load(input): Promise<LoadBackgroundSourceOutput> {
      const request = prepareSourceRequest(input.sourceId, input.params ?? {})
      const { provider } = parseSourceId(input.sourceId)
      const secrets = await resolveSourceSecrets(request.source, provider)
      const items = await request.source.loader(request.params, {
        secrets,
        updateSecrets: async (updates) => {
          Object.assign(secrets, updates)
          await updateSourceSecrets(request.source, provider, updates)
        },
      })

      return {
        items,
        updatedAt: Date.now(),
      }
    },
  }
}
