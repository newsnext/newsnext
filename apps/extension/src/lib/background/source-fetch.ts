import type { ExtensionConnectionFetchResponse } from "@newsnext/extension-connection"
import type { SourceFetch } from "@newsnext/source/types"
import { assertNetworkCapability } from "@newsnext/source/core"
import { createSourceFetch } from "@newsnext/source/utils"

export interface BackgroundSourceFetchResult {
  durationMs: number
  request: {
    method: string
    url: string
  }
  response: ExtensionConnectionFetchResponse & {
    url: string
  }
}

export function createBackgroundSourceFetch(
  sourceId: string,
  declaredHosts: readonly string[],
  signal: AbortSignal,
  results?: BackgroundSourceFetchResult[],
): SourceFetch {
  const sourceFetch = createSourceFetch(
    signal,
    url => assertNetworkCapability(sourceId, url, declaredHosts),
  )
  if (!results) return sourceFetch
  const startedAt = new Map<string, number[]>()
  const requestKey = (request: Request, retryCount: number): string =>
    `${request.method} ${request.url} ${retryCount}`

  return sourceFetch.extend({
    hooks: {
      beforeRequest: [({ request, retryCount }) => {
        const key = requestKey(request, retryCount)
        const starts = startedAt.get(key) ?? []
        starts.push(performance.now())
        startedAt.set(key, starts)
      }],
      afterResponse: [async ({ request, response, retryCount }) => {
        const key = requestKey(request, retryCount)
        const starts = startedAt.get(key)
        const start = starts?.shift()
        if (starts?.length === 0) startedAt.delete(key)
        results.push({
          durationMs: start === undefined
            ? 0
            : Math.round(performance.now() - start),
          request: {
            method: request.method,
            url: request.url,
          },
          response: {
            body: await response.clone().text(),
            headers: [...response.headers.entries()],
            status: response.status,
            statusText: response.statusText,
            url: response.url,
          },
        })
      }],
    },
  })
}
