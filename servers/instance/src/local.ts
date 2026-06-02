import type { PreparedSourceRequest } from "@newsnext/sources/service"
import type { SourceDescriptor } from "@newsnext/sources/typings"
import type { SourceLoadResult } from "./source-loader"
import type {
  LoadInstanceSourceOptions,
  NewsNextDataInstance,
  NewsNextInstanceOptions,
  SourceCachePolicyInfo,
} from "./types"
import { sourceDescriptors } from "@newsnext/sources/metadata"
import {
  prepareSourceRequest,
} from "@newsnext/sources/service"
import { buildSourceCacheKey, loadSource } from "./source-loader"

export class NewsNextInstance implements NewsNextDataInstance {
  private readonly adapter: NewsNextInstanceOptions["adapter"]
  private readonly debugInfo: NewsNextInstanceOptions["debugInfo"]

  constructor(options: NewsNextInstanceOptions) {
    this.adapter = options.adapter
    this.debugInfo = options.debugInfo
  }

  listSourceDescriptors(): SourceDescriptor[] {
    return [...sourceDescriptors].sort((a, b) => {
      const byCategory = a.category.localeCompare(b.category)
      if (byCategory !== 0) {
        return byCategory
      }

      const byProvider = (a.provider ?? "").localeCompare(b.provider ?? "")
      if (byProvider !== 0) {
        return byProvider
      }

      return a.id.localeCompare(b.id)
    })
  }

  prepareSourceRequest(sourceId: string, params: Record<string, unknown> = {}): PreparedSourceRequest {
    return prepareSourceRequest(sourceId, params)
  }

  async listSourceCachePolicies(sources: SourceDescriptor[] = this.listSourceDescriptors()): Promise<SourceCachePolicyInfo[]> {
    return Promise.all(sources.map(async (source) => {
      const sourceId = getDescriptorSourceId(source)
      const request = prepareSourceRequest(sourceId)
      const key = buildSourceCacheKey(sourceId, request.params)
      const policy = await this.adapter.getPolicy(key)

      return {
        sourceId,
        name: source.name,
        title: source.title,
        provider: source.provider,
        type: source.type ?? "hottest",
        maxCacheAge: policy?.currentMaxCacheAge ?? null,
        learned: policy !== undefined,
      }
    }))
  }

  async loadSource<T = unknown>(options: LoadInstanceSourceOptions): Promise<SourceLoadResult<T>> {
    return loadSource<T>({
      ...options,
      adapter: this.adapter,
    })
  }

  getDebugInfo() {
    return {
      mode: "local" as const,
      runtime: "unknown",
      cache: {
        type: "unknown" as const,
      },
      ...this.debugInfo,
    }
  }
}

export function createNewsNextInstance(options: NewsNextInstanceOptions): NewsNextInstance {
  return new NewsNextInstance(options)
}

function getDescriptorSourceId(source: SourceDescriptor): string {
  return `${source.provider}:${source.id}`
}

export async function createMemoryNewsNextInstance(): Promise<NewsNextInstance> {
  const { MemoryCacheAdapter } = await import("@newsnext/cache/memory")
  return createNewsNextInstance({
    adapter: new MemoryCacheAdapter(),
    debugInfo: {
      cache: {
        type: "memory",
      },
    },
  })
}

export async function createD1NewsNextInstance(d1: unknown): Promise<NewsNextInstance> {
  const { D1CacheAdapter } = await import("@newsnext/cache/d1")
  return createNewsNextInstance({
    adapter: new D1CacheAdapter(d1),
    debugInfo: {
      runtime: "cloudflare",
      cache: {
        type: "d1",
      },
    },
  })
}

export async function createSqliteNewsNextInstance(path: string): Promise<NewsNextInstance> {
  const { SqliteCacheAdapter } = await import("@newsnext/cache/sqlite")
  return createNewsNextInstance({
    adapter: await SqliteCacheAdapter.create(path),
    debugInfo: {
      runtime: "bun",
      cache: {
        type: "sqlite",
        path,
      },
    },
  })
}
