import type { CacheAdapter } from "@newsnext/cache"
import { trpcServer } from "@hono/trpc-server"
import { Hono } from "hono"
import { serveStatic } from "hono/bun"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { CACHE_DB_PATH } from "../../../data"
import { appRouter } from "./app-router"
import { authApp } from "./routes/auth"
import { proxyApp } from "./routes/proxy"

export type { AppRouter } from "./app-router"

interface Variables {
  adapter: CacheAdapter
}

const app = new Hono<{ Bindings: CloudflareBindings, Variables: Variables }>()

let adapter: CacheAdapter

app.use(logger())
app.use("/*", cors())

app.use("/api/trpc/*", async (c, next) => {
  if (!adapter) {
    try {
      const { SqliteCacheAdapter } = await import("@newsnext/cache/sqlite")
      adapter = new SqliteCacheAdapter(CACHE_DB_PATH)
      console.log("Using Sqlite cache adapter")
    } catch (e) {
      console.error("Failed to initialize Sqlite cache adapter:", e)
    }
    if (!adapter) {
      const { MemoryCacheAdapter } = await import("@newsnext/cache/memory")
      adapter = new MemoryCacheAdapter()
      console.log("Using Memory cache adapter")
    }
  }
  c.set("adapter", adapter)
  await next()
})

app.use("/api/trpc/*", (c, next) => {
  return trpcServer({
    router: appRouter,
    createContext: () => ({
      adapter: c.var.adapter,
      waitUntil: (p: Promise<any>) => c.executionCtx.waitUntil(p),
    }),
  })(c, next)
})

// Image proxy endpoint - /api/p/:encodedUrl
app.route("/api/p", proxyApp)
app.route("/api/auth", authApp)

app.get("/*", (c, next) => {
  return serveStatic({ root: "./public" })(c, next)
})

app.get("*", serveStatic({ path: "./public/index.html" }))

export default {
  port: process.env.PORT ?? 4000,
  fetch: app.fetch,
}
