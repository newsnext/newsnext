import type { $Fetch, FetchOptions } from "ofetch"
import { $fetch } from "ofetch"

type FetchHeaders = NonNullable<FetchOptions["headers"]>
type HeaderTuples = [string, string][]

interface HeaderList {
  forEach: (callback: (value: string, name: string) => void) => void
}

interface BrowserLikeGlobal {
  window?: unknown
  document?: unknown
}

interface RequestOptionsWithHeaders {
  headers?: FetchHeaders
}

const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
const browserForbiddenHeaders = new Set([
  "accept-charset",
  "accept-encoding",
  "access-control-request-headers",
  "access-control-request-method",
  "connection",
  "content-length",
  "cookie",
  "date",
  "dnt",
  "expect",
  "host",
  "keep-alive",
  "origin",
  "permissions-policy",
  "referer",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "user-agent",
  "via",
])

function isBrowserRuntime(): boolean {
  const runtime = globalThis as BrowserLikeGlobal
  return runtime.window !== undefined && runtime.document !== undefined
}

function isForbiddenBrowserHeader(name: string): boolean {
  const lowerName = name.toLowerCase()
  return browserForbiddenHeaders.has(lowerName)
    || lowerName.startsWith("proxy-")
    || lowerName.startsWith("sec-")
}

function hasHeaderListShape(headers: FetchHeaders): headers is FetchHeaders & HeaderList {
  return typeof headers === "object"
    && headers !== null
    && "forEach" in headers
    && typeof headers.forEach === "function"
}

function sanitizeBrowserHeaders(headers: FetchHeaders | undefined): FetchHeaders | undefined {
  if (!headers) {
    return headers
  }

  if (Array.isArray(headers)) {
    return headers.filter(([name]) => !isForbiddenBrowserHeader(name)) as FetchHeaders
  }

  if (hasHeaderListShape(headers)) {
    const sanitized: HeaderTuples = []
    headers.forEach((value, name) => {
      if (!isForbiddenBrowserHeader(name)) {
        sanitized.push([name, value])
      }
    })
    return sanitized as FetchHeaders
  }

  const sanitized: Record<string, string> = {}
  for (const [name, value] of Object.entries(headers as Record<string, unknown>)) {
    if (!isForbiddenBrowserHeader(name) && value !== undefined) {
      sanitized[name] = String(value)
    }
  }

  return sanitized as FetchHeaders
}

export const myFetch: $Fetch = $fetch.create({
  headers: isBrowserRuntime() ? undefined : { "User-Agent": userAgent },
  timeout: 5000,
  retry: 3,
  onRequest({ options }) {
    if (isBrowserRuntime()) {
      const requestOptions = options as RequestOptionsWithHeaders
      requestOptions.headers = sanitizeBrowserHeaders(requestOptions.headers)
    }
  },
})
