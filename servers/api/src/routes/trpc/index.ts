import type { CacheAdapter } from "@newsnext/cache"
import type { Context } from "hono"
import { trpcServer } from "@hono/trpc-server"
import { Hono } from "hono"
import { appRouter } from "./app-router"

interface Variables {
  adapter: CacheAdapter
}

type TrpcContext = Context<{ Bindings: CloudflareBindings, Variables: Variables }>
type AdapterLoader = (context: TrpcContext) => Promise<CacheAdapter>

const loadAdapterFromEnv: AdapterLoader = async (c) => {
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

export const createTrpcApp = (loadAdapter: AdapterLoader = loadAdapterFromEnv) => {
  const trpcApp = new Hono<{ Bindings: CloudflareBindings, Variables: Variables }>()
  let adapter: CacheAdapter | undefined

  trpcApp.use("/*", async (c, next) => {
    if (!adapter) {
      try {
        adapter = await loadAdapter(c)
      } catch (error) {
        console.error("Failed to load cache adapter:", error)
      }
    }

    if (!adapter) {
      const { MemoryCacheAdapter } = await import("@newsnext/cache/memory")
      adapter = new MemoryCacheAdapter()
      console.log("Using Memory cache adapter (fallback)")
    }

    c.set("adapter", adapter)
    await next()
  })

  trpcApp.use("/*", (c, next) => {
    return trpcServer({
      router: appRouter,
      createContext: () => ({
        adapter: c.var.adapter,
        waitUntil: (p: Promise<any>) => c.executionCtx.waitUntil(p),
      }),
    })(c, next)
  })

  return trpcApp
}

export const trpcApp = createTrpcApp()

export type { AdapterLoader }
