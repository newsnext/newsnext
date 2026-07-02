import type { CacheAdapter, CacheResult } from "@newsnext/cache"
import type { NewsNextDataInstance } from "@newsnext/instance"
import type { SourceDescriptor } from "@newsnext/server-source/typings"
import { getCachedSource } from "@newsnext/cache"
import { createNewsNextInstance } from "@newsnext/instance"

export interface LoadApiSourceOptions {
  sourceId: string
  params?: Record<string, unknown>
  paramsAreNormalized?: boolean
  latest?: boolean
  waitUntil?: (promise: Promise<unknown>) => void
}

export interface ApiSourceLoadResult<T> extends CacheResult<T> {
  id: string
  key: string
}

export interface ApiNewsNextInstance {
  listSourceDescriptors: () => Promise<SourceDescriptor[]>
  loadSource: <T = unknown>(options: LoadApiSourceOptions) => Promise<ApiSourceLoadResult<T>>
}

export class CachedNewsNextInstance implements ApiNewsNextInstance {
  private readonly sourceInstance: NewsNextDataInstance
  private readonly adapter: CacheAdapter

  constructor(adapter: CacheAdapter, sourceInstance: NewsNextDataInstance = createNewsNextInstance()) {
    this.adapter = adapter
    this.sourceInstance = sourceInstance
  }

  async listSourceDescriptors(): Promise<SourceDescriptor[]> {
    return this.sourceInstance.listSourceDescriptors()
  }

  async loadSource<T = unknown>({
    sourceId,
    params = {},
    paramsAreNormalized = false,
    latest = false,
    waitUntil,
  }: LoadApiSourceOptions): Promise<ApiSourceLoadResult<T>> {
    const request = this.sourceInstance.prepareInstanceSourceRequest<T>({
      sourceId,
      params,
      paramsAreNormalized,
    })
    const result = await getCachedSource<T>({
      key: request.key,
      fetcher: request.fetcher,
      adaptiveMaxCacheAge: true,
      cacheMode: request.source.type ?? "hottest",
      forceRefresh: latest,
      waitUntil,
    }, this.adapter)

    return {
      id: sourceId,
      key: request.key,
      ...result,
    }
  }
}

export function createCachedNewsNextInstance(adapter: CacheAdapter): CachedNewsNextInstance {
  return new CachedNewsNextInstance(adapter)
}
