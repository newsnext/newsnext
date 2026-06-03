import { defineHandler, HTTPError } from "nitro"
import { getRouterParam } from "nitro/h3"

export default defineHandler(async (event) => {
  const encodedUrl = getRouterParam(event, "encodedUrl")

  if (!encodedUrl) {
    throw new HTTPError({ status: 400, message: "Missing image URL" })
  }

  let url: string
  try {
    url = decodeURIComponent(encodedUrl)
  } catch {
    throw new HTTPError({ status: 400, message: "Invalid URL encoding" })
  }

  try {
    const urlObject = new URL(url)
    const response = await fetch(url, {
      headers: {
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": `${urlObject.origin}/`,
      },
    })

    const headers = new Headers(response.headers)
    headers.delete("Set-Cookie")
    headers.set("Cache-Control", "public, max-age=31536000, immutable")
    headers.set("Access-Control-Allow-Origin", "*")

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to proxy image"
    console.error("[Image Proxy] EXCEPTION:", error)
    throw new HTTPError({ status: 500, message })
  }
})
