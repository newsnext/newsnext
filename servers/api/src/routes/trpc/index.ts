import type { NewsNextDataInstance } from "@newsnext/instance"
import type { Context } from "hono"
import { trpcServer } from "@hono/trpc-server"
import { Hono } from "hono"
import { appRouter } from "./app-router"
import { createContext } from "./context"

interface Variables {
  instance: NewsNextDataInstance
}

type TrpcContext = Context<{ Bindings: CloudflareBindings, Variables: Variables }>
type InstanceLoader = (context: TrpcContext) => Promise<NewsNextDataInstance>

export const createTrpcApp = (loadInstance: InstanceLoader) => {
  const trpcApp = new Hono<{ Bindings: CloudflareBindings, Variables: Variables }>()
  let instance: NewsNextDataInstance | undefined

  trpcApp.use("/*", async (c, next) => {
    if (!instance) {
      try {
        instance = await loadInstance(c)
      } catch (error) {
        console.error("Failed to load data instance:", error)
      }
    }

    if (!instance) {
      const { createMemoryNewsNextInstance } = await import("@newsnext/instance")
      instance = await createMemoryNewsNextInstance()
      console.log("Using Memory data instance (fallback)")
    }

    c.set("instance", instance)
    await next()
  })

  trpcApp.use("/*", (c, next) => {
    return trpcServer({
      router: appRouter,
      createContext: async () => ({
        ...await createContext({ hono: c }),
        instance: c.var.instance,
        waitUntil: (p: Promise<unknown>) => c.executionCtx.waitUntil(p),
      }),
    })(c, next)
  })

  return trpcApp
}

export type { InstanceLoader }
