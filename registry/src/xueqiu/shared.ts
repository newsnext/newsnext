import type { SourceFetch } from "@newsnext/source-kit/types"

export const XUEQIU_ORIGIN = "https://xueqiu.com"

const XUEQIU_SESSION_ERROR_CODE = "400016"

interface XueqiuRequestContext {
  url: string
  fetch: SourceFetch
  signal?: AbortSignal
}

export function requestXueqiuJson({
  url,
  fetch,
  signal,
}: XueqiuRequestContext): Promise<Response> {
  const xueqiuFetch = fetch.extend({
    hooks: {
      afterResponse: [async ({ request, response, retryCount }) => {
        if (response.status !== 400 || retryCount > 0) return

        let error: unknown
        try {
          error = await response.clone().json()
        } catch {
          signal?.throwIfAborted()
          return
        }
        if (!error || typeof error !== "object" || !("error_code" in error)) return
        if (String(error.error_code) !== XUEQIU_SESSION_ERROR_CODE) return

        try {
          await fetch.get(`${XUEQIU_ORIGIN}/hq`)
        } catch {
          signal?.throwIfAborted()
          return
        }

        return fetch.retry({
          code: "XUEQIU_SESSION_BOOTSTRAPPED",
          request,
        })
      }],
    },
  })

  return xueqiuFetch.get(url)
}
