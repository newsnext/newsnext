import type { NewsNextDatabase } from "@newsnext/database/db0"
import type { H3Event } from "nitro"
import type { ApiCloudflareBindings } from "@/cloudflare-bindings"
import type { ApiNewsNextInstance } from "@/instance-client"
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
  if (!bindings?.DB && !("Bun" in globalThis)) {
    throw new Error("DB binding is required for NewsNext API database")
  }

  const { getApiDatabase } = await import("@/local-database")
  return getApiDatabase()
}

export type Context = Awaited<ReturnType<typeof createContext>> & {
  instance: ApiNewsNextInstance
  waitUntil?: (promise: Promise<unknown>) => void
}
