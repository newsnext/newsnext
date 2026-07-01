import { defineHandler, HTTPError } from "nitro"
import { getRouterParam } from "nitro/h3"
import { createSafeProxiedImageHeaders } from "@/proxy-headers"

function isImageContentType(contentType: string | null): boolean {
  return contentType?.toLowerCase().startsWith("image/") ?? false
}

export default defineHandler(async (event) => {
  const encodedUrl = getRouterParam(event, "encodedUrl")

  if (!encodedUrl) {
    throw HTTPError.status(400, "Missing image URL")
  }

  let url: string
  try {
    url = decodeURIComponent(encodedUrl)
  } catch {
    throw HTTPError.status(400, "Invalid URL encoding")
  }

  let urlObject: URL
  try {
    urlObject = new URL(url)
  } catch {
    throw HTTPError.status(400, "Invalid image URL")
  }

  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": `${urlObject.origin}/`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to proxy image"
    console.error("[Image Proxy] EXCEPTION:", error)
    throw HTTPError.status(500, "Failed to proxy image", { message })
  }

  if (!response.ok) {
    await response.body?.cancel()
    throw HTTPError.status(response.status, "Upstream image request failed", {
      message: `Upstream image request failed with status ${response.status}`,
    })
  }

  const contentType = response.headers.get("content-type")

  if (!isImageContentType(contentType)) {
    await response.body?.cancel()
    throw HTTPError.status(502, "Upstream response is not an image", {
      message: `Upstream response is not an image: ${contentType ?? "missing content-type"}`,
    })
  }

  const headers = createSafeProxiedImageHeaders(response.headers)

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
})
