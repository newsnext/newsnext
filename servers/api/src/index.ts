import type { H3Event } from "nitro"
import type { ApiNewsNextInstance } from "./instance-client"
import type { ApiCloudflareBindings } from "./cloudflare-bindings"
import type { CacheAdapter } from "@newsnext/cache"
import { getNitroCloudflareEnv } from "./cloudflare-bindings"
import { createCachedNewsNextInstance } from "./instance-client"

export type { AppRouter } from "./routes/trpc/app-router"

let instance: ApiNewsNextInstance | undefined

export async function loadInstance(event: H3Event): Promise<ApiNewsNextInstance> {
  if (instance) {
    return instance
  }

  const bindings = getNitroCloudflareEnv(event)
  instance = createCachedNewsNextInstance(await getCacheAdapter(bindings))
  return instance
}

async function getCacheAdapter(bindings: ApiCloudflareBindings | undefined): Promise<CacheAdapter> {
  if (!bindings?.DB && !("Bun" in globalThis)) {
    throw new Error("DB binding is required for NewsNext API cache")
  }

  const { Db0CacheAdapter } = await import("@newsnext/cache/db0")
  const { useDatabase } = await import("nitro/database")
  return Db0CacheAdapter.fromDb0(useDatabase() as never)
}
