import type { NewsNextDataInstance } from "@newsnext/instance"
import type { Context as HonoContext } from "hono"
import { auth } from "../../lib/auth"

export interface CreateContextOptions {
  hono: HonoContext
}

export async function createContext({ hono }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: hono.req.raw.headers,
  })

  return {
    session,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>> & {
  instance: NewsNextDataInstance
  waitUntil?: (promise: Promise<unknown>) => void
}
