import type { NewsItem } from "@/typings/source"
import { stableStringify } from "@newsnext/shared/utils"
import { normalizeSourceParams, resolveSource } from "@newsnext/sources/service"
import { createBackgroundClient } from "./background-client"

export interface LocalSourceLoadResult {
  id: string
  key: string
  items: NewsItem[]
  updated: number
}

async function loadLocalSourceViaBackground(
  sourceId: string,
  queryParams: Record<string, unknown>,
  normalizedParams: Record<string, unknown>,
): Promise<LocalSourceLoadResult | undefined> {
  const backgroundClient = createBackgroundClient()

  if (!backgroundClient) {
    return undefined
  }

  const response = await backgroundClient.loadSource({
    sourceId,
    params: queryParams,
  })

  return {
    id: sourceId,
    key: response.key ?? `${sourceId}:${stableStringify(normalizedParams)}`,
    items: response.items,
    updated: response.updated ?? Date.now(),
  }
}

export async function loadLocalSource(
  sourceId: string,
  queryParams: Record<string, unknown> = {},
): Promise<LocalSourceLoadResult> {
  const source = resolveSource(sourceId)
  const params = normalizeSourceParams(source, queryParams)
  const backgroundResult = await loadLocalSourceViaBackground(sourceId, queryParams, params)

  if (backgroundResult) {
    return backgroundResult
  }

  const items = await source.loader(params)

  return {
    id: sourceId,
    key: `${sourceId}:${stableStringify(params)}`,
    items,
    updated: Date.now(),
  }
}
