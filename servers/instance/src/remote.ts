import type { SourceLoadResult } from "@newsnext/sources/service"
import type { SourceDescriptor } from "@newsnext/sources/typings"
import type {
  InstanceDebugInfo,
  InstanceResponse,
  LoadInstanceSourceOptions,
  NewsNextDataInstance,
  RemoteNewsNextInstanceOptions,
} from "./types"
import { isSourceErrorCode, SourceServiceError } from "./errors"

export class RemoteNewsNextInstance implements NewsNextDataInstance {
  private readonly baseUrl: URL
  private readonly fetch: typeof fetch

  constructor(options: RemoteNewsNextInstanceOptions) {
    this.baseUrl = new URL(options.url)
    this.fetch = options.fetch ?? globalThis.fetch
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

  async getDebugInfo(): Promise<InstanceDebugInfo> {
    try {
      return await this.request<InstanceDebugInfo>("/debug")
    } catch {
      return {
        mode: "remote" as const,
        runtime: "remote",
        cache: {
          type: "remote" as const,
        },
        remoteUrl: this.baseUrl.toString(),
      }
    }
  }

  private async request<T>(pathname: string, init?: RequestInit): Promise<T> {
    const url = new URL(pathname.replace(/^\//, ""), this.baseUrlWithSlash())
    const response = await this.fetch(url, init)
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
