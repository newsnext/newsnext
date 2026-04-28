import type { CacheAdapter } from "@newsnext/cache"
import type { Context } from "hono"
import { trpcServer } from "@hono/trpc-server"
import { Hono } from "hono"
import { appRouter } from "./app-router"
import { createContext } from "./context"

interface Variables {
  adapter: CacheAdapter
}

type TrpcContext = Context<{ Bindings: CloudflareBindings, Variables: Variables }>
type AdapterLoader = (context: TrpcContext) => Promise<CacheAdapter>

export const createTrpcApp = (loadAdapter: AdapterLoader) => {
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
      createContext: async () => ({
        ...await createContext({ hono: c }),
        adapter: c.var.adapter,
        waitUntil: (p: Promise<any>) => c.executionCtx.waitUntil(p),
      }),
    })(c, next)
  })

  return trpcApp
}

export type { AdapterLoader }
