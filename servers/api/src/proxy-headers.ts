const PROXIED_RESPONSE_HEADERS_TO_DROP = [
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "set-cookie",
  "transfer-encoding",
  "upgrade",
]

export function createSafeProxiedImageHeaders(upstreamHeaders: Headers): Headers {
  const headers = new Headers(upstreamHeaders)

  for (const header of PROXIED_RESPONSE_HEADERS_TO_DROP) {
    headers.delete(header)
  }

  headers.set("Cache-Control", "public, max-age=31536000, immutable")
  headers.set("Access-Control-Allow-Origin", "*")

  return headers
}
