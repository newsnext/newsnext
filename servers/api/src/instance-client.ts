import type { SourceErrorCode } from "@newsnext/sources/service"
import type { SourceDescriptor } from "@newsnext/sources/typings"
import { SourceServiceError } from "@newsnext/sources/service"

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

export interface LoadInstanceSourceOptions {
  sourceId: string
  params?: Record<string, unknown>
  paramsAreNormalized?: boolean
  latest?: boolean
  waitUntil?: (promise: Promise<unknown>) => void
}

export interface SourceLoadResult<T> {
  id: string
  key: string
  items: T
  updated: number
  status: "success" | "cache"
}

export interface NewsNextDataInstance {
  listSourceDescriptors: () => MaybePromise<SourceDescriptor[]>
  loadSource: <T = unknown>(options: LoadInstanceSourceOptions) => Promise<SourceLoadResult<T>>
}

export interface RemoteNewsNextInstanceOptions {
  url: string
  fetch?: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>
}

type FetchFunction = (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>

export class RemoteNewsNextInstance implements NewsNextDataInstance {
  private readonly baseUrl: URL
  private readonly customFetch?: FetchFunction

  constructor(options: RemoteNewsNextInstanceOptions) {
    this.baseUrl = new URL(options.url)
    this.customFetch = options.fetch
  }

  async listSourceDescriptors(): Promise<SourceDescriptor[]> {
    return this.request<SourceDescriptor[]>("/sources")
  }

  async loadSource<T = unknown>(options: LoadInstanceSourceOptions): Promise<SourceLoadResult<T>> {
    const sourceId = encodeURIComponent(options.sourceId)
    return this.request<SourceLoadResult<T>>(`/sources/${sourceId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        params: options.params ?? {},
        latest: options.latest,
        paramsAreNormalized: options.paramsAreNormalized,
      }),
    })
  }

  private async request<T>(pathname: string, init?: RequestInit): Promise<T> {
    const url = new URL(pathname.replace(/^\//, ""), this.baseUrlWithSlash())
    const response = this.customFetch
      ? await this.customFetch(url.toString(), init)
      : await globalThis.fetch(url.toString(), init)
    const payload = await response.json() as InstanceResponse<T>

    if (payload.success) {
      return payload.data
    }

    if (isSourceErrorCode(payload.error.code)) {
      throw new SourceServiceError(payload.error.code, payload.error.message)
    }

    throw new Error(payload.error.message)
  }

  private baseUrlWithSlash(): URL {
    const url = new URL(this.baseUrl)
    if (!url.pathname.endsWith("/")) {
      url.pathname = `${url.pathname}/`
    }
    return url
  }
}

export function createRemoteNewsNextInstance(url: string): RemoteNewsNextInstance {
  return new RemoteNewsNextInstance({ url })
}

function isSourceErrorCode(code: string): code is SourceErrorCode {
  return code === "SOURCE_NOT_FOUND"
    || code === "INVALID_PARAMS"
    || code === "INVALID_FORMAT"
    || code === "LOADER_NOT_FOUND"
    || code === "PROVIDER_NOT_FOUND"
}
