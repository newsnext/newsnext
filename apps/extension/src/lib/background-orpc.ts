import type { NewsItem } from "@newsnext/sources/typings"
import { prepareSourceRequest } from "@newsnext/sources/service"
import { os } from "@orpc/server"

export interface LoadSourceInput {
  sourceId: string
  params?: Record<string, unknown>
}

export interface LoadSourceOutput {
  items: NewsItem[]
  updated: number
}

export const backgroundRouter = {
  loadSource: os.handler(async ({ input }: { input: LoadSourceInput }): Promise<LoadSourceOutput> => {
    const request = prepareSourceRequest(input.sourceId, input.params ?? {})
    const items = await request.source.loader(request.params)

    return {
      items,
      updated: Date.now(),
    }
  }),
}

export type BackgroundRouter = typeof backgroundRouter
