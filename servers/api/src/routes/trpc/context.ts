import type { NewsNextDataInstance } from "@newsnext/instance/types"
import type { NewsNextDatabase } from "@newsnext/database/d1"
import type { ApiCloudflareBindings } from "../../cloudflare-bindings"
import type { H3Event } from "nitro"
import { createD1Db } from "@newsnext/database/d1"
import { getCloudflareBindings } from "../../cloudflare-bindings"

export interface CreateContextOptions {
  event: H3Event
}

export async function createContext({ event }: CreateContextOptions) {
  const bindings = getCloudflareBindings(getNitroCloudflareEnv(event), event.req)
  const { getAuth } = await import("../../lib/auth")
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
  if (!bindings?.DATA_DB) {
    throw new Error("DATA_DB binding is required for NewsNext API database")
  }

  return createD1Db(bindings.DATA_DB)
}

export type Context = Awaited<ReturnType<typeof createContext>> & {
  instance: NewsNextDataInstance
  waitUntil?: (promise: Promise<unknown>) => void
}

interface NitroCloudflareRuntime {
  cloudflare?: {
    env?: ApiCloudflareBindings
  }
}

interface NitroRequest extends Request {
  runtime?: NitroCloudflareRuntime
}

function getNitroCloudflareEnv(event: H3Event): ApiCloudflareBindings | undefined {
  return (event.req as NitroRequest).runtime?.cloudflare?.env
}
