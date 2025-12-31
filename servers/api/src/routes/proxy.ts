import { Hono } from "hono"
import { proxy } from "hono/proxy"

export const proxyApp = new Hono()

proxyApp.get("/:encodedUrl", async (c) => {
  const encodedUrl = c.req.param("encodedUrl")

  if (!encodedUrl) {
    return c.json({ error: "Missing image URL" }, 400)
  }

  let url: string
  try {
    url = decodeURIComponent(encodedUrl)
  } catch {
    return c.json({ error: "Invalid URL encoding" }, 400)
  }

  try {
    const urlObj = new URL(url)

    const headers: Record<string, string> = {
      "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": `${urlObj.origin}/`,
    }

    return proxy(url, {
      headers,
    }).then((res) => {
      res.headers.delete("Set-Cookie")
      res.headers.set("Cache-Control", "public, max-age=31536000, immutable")
      res.headers.set("Access-Control-Allow-Origin", "*")
      return res
    })
  } catch (err: any) {
    console.error("[Image Proxy] EXCEPTION:", err)
    return c.json({ error: err.message || "Failed to proxy image" }, 500)
  }
})
