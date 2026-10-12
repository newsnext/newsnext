export const XUEQIU_ORIGIN = "https://xueqiu.com"
const XUEQIU_SESSION_ERROR_CODE = "400016"
export function requestXueqiuJson({ url, fetch, signal }) {
  const xueqiuFetch = fetch.extend({
    hooks: {
      afterResponse: [async ({ request, response, retryCount }) => {
        // WHY: guard on retryCount and return context.fetch.retry(); recursing the loader would bypass the shared retry budget.
        if (response.status !== 400 || retryCount > 0)
          return
        let error
        try {
          error = await response.clone().json()
        } catch {
          signal?.throwIfAborted()
          return
        }
        if (!error || typeof error !== "object" || !("error_code" in error))
          return
        if (String(error.error_code) !== XUEQIU_SESSION_ERROR_CODE)
          return
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
