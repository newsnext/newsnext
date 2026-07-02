import type { NewsItem } from "@newsnext/sources/typings"
import { prepareSourceRequest } from "@newsnext/sources/service"
import { os, type } from "@orpc/server"

export interface LoadSourceInput {
  sourceId: string
  params?: Record<string, unknown>
}

export interface LoadSourceOutput {
  items: NewsItem[]
  updatedAt: number
}

export const backgroundRouter = {
  loadSource: os
    .input(type<LoadSourceInput>())
    .handler(async ({ input }): Promise<LoadSourceOutput> => {
      const request = prepareSourceRequest(input.sourceId, input.params ?? {})
      const items = await request.source.loader(request.params)

      return {
        items,
        updatedAt: Date.now(),
      }
    }),
}

export type BackgroundRouter = typeof backgroundRouter
