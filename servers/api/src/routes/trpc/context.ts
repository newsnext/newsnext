import type { NewsNextDataInstance } from "@newsnext/instance/types"
import type { Context as HonoContext } from "hono"
import type { NewsNextDatabase } from "@newsnext/database"
import { createD1Db, getDb } from "@newsnext/database"
import { getCloudflareBindings } from "../../cloudflare-bindings"
import { getAuth } from "../../lib/auth"

export interface CreateContextOptions {
  hono: HonoContext
}

export async function createContext({ hono }: CreateContextOptions) {
  const bindings = getCloudflareBindings(hono.env as CloudflareBindings | undefined, hono.req.raw)
  const auth = await getAuth(bindings)
  const session = await auth.api.getSession({
    headers: hono.req.raw.headers,
  })
  const db = await getDatabase(bindings)

  return {
    db,
    session,
  }
}

async function getDatabase(bindings: CloudflareBindings | undefined): Promise<NewsNextDatabase> {
  if (bindings?.DATA_DB) {
    return createD1Db(bindings.DATA_DB)
  }

  return getDb()
}

export type Context = Awaited<ReturnType<typeof createContext>> & {
  instance: NewsNextDataInstance
  waitUntil?: (promise: Promise<unknown>) => void
}
