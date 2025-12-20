import type { CacheAdapter } from "@newsnext/cache"
import { trpcServer } from "@hono/trpc-server"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { appRouter } from "./app-router"

export type { AppRouter } from "./app-router"

interface Variables {
  adapter: CacheAdapter
}

const app = new Hono<{ Bindings: CloudflareBindings, Variables: Variables }>()

let adapter: CacheAdapter

app.use(logger())
app.use("/*", cors())

app.use("*", async (c, next) => {
  if (!adapter) {
    if (c.env.CACHE_DB) {
      try {
        const { D1CacheAdapter } = await import("@newsnext/cache/d1")
        adapter = new D1CacheAdapter(c.env.CACHE_DB)
        console.log("Using D1 cache adapter")
      } catch (e) {
        console.error("Failed to initialize D1 cache adapter:", e)
      }
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

app.use("/trpc/*", (c, next) => {
  return trpcServer({
    router: appRouter,
    createContext: () => ({
      adapter: c.var.adapter,
      waitUntil: (p: Promise<any>) => c.executionCtx.waitUntil(p),
    }),
  })(c, next)
})

export default {
  port: process.env.PORT ?? 4000,
  fetch: app.fetch,
}
