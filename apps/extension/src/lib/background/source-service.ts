import type { NewsItem } from "@newsnext/client-source/typings"
import { parseSourceId, prepareSourceRequest } from "@newsnext/client-source/service"
import { resolveSourceSecrets } from "./source-secrets"

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
      const items = await request.source.loader(request.params, { secrets })

      return {
        items,
        updatedAt: Date.now(),
      }
    },
  }
}
