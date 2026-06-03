import type { CacheAdapter } from "@newsnext/cache"
import type { SourceDescriptor } from "@newsnext/sources/typings"
import type { LoadSourceOptions, SourceLoadResult } from "./source-loader"

export interface InstanceSuccessResponse<T> {
  success: true
  data: T
}

export interface InstanceErrorResponse {
  success: false
  error: {
    code: string
    message: string
  }
}

export type InstanceResponse<T> = InstanceSuccessResponse<T> | InstanceErrorResponse
export type MaybePromise<T> = T | Promise<T>

export interface NewsNextInstanceOptions {
  adapter: CacheAdapter
  debugInfo?: Partial<InstanceDebugInfo>
}

export type LoadInstanceSourceOptions = Omit<LoadSourceOptions, "adapter">

export interface SourceCachePolicyInfo {
  sourceId: string
  name: string
  title?: string
  provider?: string
  type: "hottest" | "timeline"
  maxCacheAge: number | null
  learned: boolean
}

export interface NewsNextDataInstance {
  listSourceDescriptors: () => MaybePromise<SourceDescriptor[]>
  listSourceCachePolicies?: (sources?: SourceDescriptor[]) => MaybePromise<SourceCachePolicyInfo[]>
  loadSource: <T = unknown>(options: LoadInstanceSourceOptions) => Promise<SourceLoadResult<T>>
  getDebugInfo?: () => MaybePromise<InstanceDebugInfo>
}

export interface InstanceDebugInfo {
  mode: "local" | "remote"
  runtime: string
  cache: {
    type: "memory" | "d1" | "sqlite" | "remote" | "unknown"
    path?: string
  }
  remoteUrl?: string
  sourcePolicies?: SourceCachePolicyInfo[]
}

export interface RemoteNewsNextInstanceOptions {
  url: string
  fetch?: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>
}

export interface CloudflareNewsNextInstanceOptions {
  bindings: Pick<Partial<CloudflareBindings>, "CACHE_DB" | "DATA_DB">
  remoteUrl?: string
}

export interface BunNewsNextInstanceOptions {
  remoteUrl?: string
  cachePath?: string
}
