import type { SourceLoaderResult } from "./source.js"

export interface FetchResponse {
  status: number
  statusText: string
  headers: [string, string][]
  body: string
}
export interface BackgroundSourceFetchResult {
  durationMs: number
  request: {
    method: string
    url: string
  }
  response: FetchResponse & {
    url: string
  }
}

interface RunDeveloperSourceOptions {
  debug: boolean
  params?: Record<string, unknown>
  sourceId: string
}

export type RunDeveloperSourceInput = RunDeveloperSourceOptions & (
  | {
    provider?: never
    providerId?: never
    useProviderSecrets?: never
  }
  | {
    provider: unknown
    providerId: string
    useProviderSecrets?: boolean
  }
)

export interface RunDeveloperSourceOutput extends Omit<SourceLoaderResult, "items"> {
  data: SourceLoaderResult["items"]
  execution: {
    durationMs: number
    loadedAt: number
    params: Record<string, unknown>
    providerId: string
    sourceId: string
    sourceVersion: number
  }
  fetches?: BackgroundSourceFetchResult[]
}

export interface ConnectedFetchInput {
  body?: string
  headers: [string, string][]
  method: string
  timeoutMs: number
  url: string
}
