import { initTRPC } from "@trpc/server"
import type { CacheAdapter } from "@newsnext/cache"

export type Context = {
  adapter: CacheAdapter
}

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure
