import type { CacheAdapter } from "@newsnext/cache"
import type { AdapterLoader } from "./routes/trpc"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { authApp } from "./routes/auth"
import { proxyApp } from "./routes/proxy"
import { createTrpcApp } from "./routes/trpc"

interface Variables {
  adapter: CacheAdapter
}

const app = new Hono<{ Bindings: CloudflareBindings, Variables: Variables }>()

app.use(logger())
app.use("/*", cors())

export const loadAdapter: AdapterLoader = async (c) => {
  if (c.env.CACHE_DB) {
    try {
      const { D1CacheAdapter } = await import("@newsnext/cache/d1")
      console.log("Using D1 cache adapter")
      return new D1CacheAdapter(c.env.CACHE_DB)
    } catch (error) {
      console.error("Failed to initialize D1 cache adapter:", error)
    }
  }

  const { MemoryCacheAdapter } = await import("@newsnext/cache/memory")
  console.log("Using Memory cache adapter")
  return new MemoryCacheAdapter()
}

app.route("/api/trpc", createTrpcApp(loadAdapter))

// Image proxy endpoint - /api/p/:encodedUrl
app.route("/api/p", proxyApp)

app.route("/api/auth", authApp)

export default {
  port: process.env.PORT ?? 4000,
  fetch: app.fetch,
}
