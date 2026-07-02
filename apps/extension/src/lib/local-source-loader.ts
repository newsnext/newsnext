import type { NewsItem } from "@/typings/source"
import { stableStringify } from "@newsnext/shared/utils"
import { normalizeSourceParams, resolveSource } from "@newsnext/sources/service"
import { createBackgroundClient } from "./background-client"
import { readCachedLocalSource, writeCachedLocalSource } from "./local-source-cache"

const SOURCE_REQUEST_MIN_INTERVAL = 1000 * 60
const inFlightSourceLoads = new Map<string, Promise<LocalSourceLoadResult>>()

export interface LocalSourceLoadResult {
  id: string
  key: string
  items: NewsItem[]
  updatedAt: number
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
    updatedAt: response.updatedAt ?? Date.now(),
  }
}

export interface LoadLocalSourceOptions {
  forceFresh?: boolean
}

export async function loadLocalSource(
  sourceId: string,
  queryParams: Record<string, unknown> = {},
  options: LoadLocalSourceOptions = {},
): Promise<LocalSourceLoadResult> {
  const source = resolveSource(sourceId)
  const params = normalizeSourceParams(source, queryParams)
  const key = `${sourceId}:${stableStringify(params)}`
  const cachedResult = options.forceFresh
    ? undefined
    : await readCachedLocalSource(key, SOURCE_REQUEST_MIN_INTERVAL)

  if (cachedResult?.items.length) {
    return cachedResult
  }

  const inFlightLoad = inFlightSourceLoads.get(key)
  if (inFlightLoad) {
    return inFlightLoad
  }

  const sourceLoad = loadFreshLocalSource(sourceId, queryParams, params, key)
  inFlightSourceLoads.set(key, sourceLoad)

  try {
    return await sourceLoad
  } finally {
    inFlightSourceLoads.delete(key)
  }
}

async function loadFreshLocalSource(
  sourceId: string,
  queryParams: Record<string, unknown>,
  params: Record<string, unknown>,
  key: string,
): Promise<LocalSourceLoadResult> {
  const source = resolveSource(sourceId)
  const backgroundResult = await loadLocalSourceViaBackground(sourceId, queryParams, params)

  if (backgroundResult) {
    const result = { ...backgroundResult, key }
    if (result.items.length) {
      await writeCachedLocalSource(result)
    }
    return result
  }

  const items = await source.loader(params)

  const result = {
    id: sourceId,
    key,
    items,
    updatedAt: Date.now(),
  }

  if (result.items.length) {
    await writeCachedLocalSource(result)
  }
  return result
}
