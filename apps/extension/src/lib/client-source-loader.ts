import type { NewsItem } from "@/typings/source"
import { normalizeSourceParams, resolveSource } from "@newsnext/client-source/service"
import { stableStringify } from "@newsnext/shared/utils"
import { createBackgroundClient } from "./background-client"
import { readCachedClientSource, writeCachedClientSource } from "./client-source-cache"

const SOURCE_REQUEST_MIN_INTERVAL = 1000 * 60
const EMPTY_SOURCE_ITEMS_ERROR_MESSAGE = "No source items. Refresh to try again."
const inFlightClientSourceLoads = new Map<string, Promise<ClientSourceLoadResult>>()

export interface ClientSourceLoadResult {
  id: string
  key: string
  items: NewsItem[]
  updatedAt: number
}

export interface LoadClientSourceOptions {
  forceFresh?: boolean
}

export async function loadClientSource(
  sourceId: string,
  queryParams: Record<string, unknown> = {},
  options: LoadClientSourceOptions = {},
): Promise<ClientSourceLoadResult> {
  const source = resolveSource(sourceId)
  const params = normalizeSourceParams(source, queryParams)
  const key = `${sourceId}:${stableStringify(params)}`
  const cachedResult = options.forceFresh
    ? undefined
    : await readCachedClientSource(key, SOURCE_REQUEST_MIN_INTERVAL)

  if (cachedResult?.items.length) {
    return cachedResult
  }

  const inFlightLoad = inFlightClientSourceLoads.get(key)
  if (inFlightLoad) {
    return inFlightLoad
  }

  const sourceLoad = loadFreshClientSource({
    sourceId,
    queryParams,
    key,
    loadInCurrentContext: () => source.loader(params),
  })
  inFlightClientSourceLoads.set(key, sourceLoad)

  try {
    return await sourceLoad
  } finally {
    inFlightClientSourceLoads.delete(key)
  }
}

interface FreshClientSourceLoad {
  sourceId: string
  queryParams: Record<string, unknown>
  key: string
  loadInCurrentContext: () => Promise<NewsItem[]>
}

async function loadFreshClientSource(request: FreshClientSourceLoad): Promise<ClientSourceLoadResult> {
  const backgroundClient = createBackgroundClient()
  const loaded = backgroundClient
    ? await backgroundClient.source.load({
        sourceId: request.sourceId,
        params: request.queryParams,
      })
    : {
        items: await request.loadInCurrentContext(),
        updatedAt: Date.now(),
      }

  const result = {
    id: request.sourceId,
    key: request.key,
    items: loaded.items,
    updatedAt: loaded.updatedAt,
  }

  if (!result.items.length) {
    throw new Error(EMPTY_SOURCE_ITEMS_ERROR_MESSAGE)
  }

  if (result.items.length) {
    await writeCachedClientSource(result)
  }

  return result
}
