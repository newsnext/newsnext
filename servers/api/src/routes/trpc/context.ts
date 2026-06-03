import type { NewsNextDatabase } from "@newsnext/database/d1"
import type { NewsNextDataInstance } from "@newsnext/instance/types"
import type { H3Event } from "nitro"
import type { ApiCloudflareBindings } from "@/cloudflare-bindings"
import { getNitroCloudflareEnv } from "@/cloudflare-bindings"

export interface CreateContextOptions {
  event: H3Event
}

export async function createContext({ event }: CreateContextOptions) {
  const bindings = getNitroCloudflareEnv(event)
  const { getAuth } = await import("@/lib/auth")
  const auth = await getAuth(bindings)
  const session = await auth.api.getSession({
    headers: event.req.headers,
  })
  const db = await getDatabase(bindings)

  return {
    db,
    session,
  }
}

async function getDatabase(bindings: ApiCloudflareBindings | undefined): Promise<NewsNextDatabase> {
  if (!bindings?.DATA_DB && !("Bun" in globalThis)) {
    throw new Error("DATA_DB binding is required for NewsNext API database")
  }

  const { getApiDatabase } = await import("@/local-database")
  return getApiDatabase()
}

export type Context = Awaited<ReturnType<typeof createContext>> & {
  instance: NewsNextDataInstance
  waitUntil?: (promise: Promise<unknown>) => void
}
