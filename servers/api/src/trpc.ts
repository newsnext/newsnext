import type { CacheAdapter } from "@newsnext/cache"
import { initTRPC } from "@trpc/server"

export interface Context {
  adapter: CacheAdapter
}

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure
