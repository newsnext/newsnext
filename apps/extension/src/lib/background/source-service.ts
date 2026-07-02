import type { NewsItem } from "@newsnext/client-source/typings"
import { prepareSourceRequest } from "@newsnext/client-source/service"

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
      const items = await request.source.loader(request.params)

      return {
        items,
        updatedAt: Date.now(),
      }
    },
  }
}
