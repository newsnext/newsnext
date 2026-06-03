import type { Database } from "db0"
import { Db0CacheAdapter } from "@newsnext/cache/db0"
import { createNewsNextInstance } from "./local"
import { useDatabase } from "nitro/database"

export async function createNitroDatabaseNewsNextInstance() {
  const isCloudflare = typeof Bun === "undefined"
  return createNewsNextInstance({
    adapter: await Db0CacheAdapter.fromDb0(useDatabase() as Database),
    debugInfo: {
      runtime: isCloudflare ? "cloudflare" : "bun",
      cache: {
        type: isCloudflare ? "d1" : "sqlite",
        path: "nitro:database:default",
      },
    },
  })
}
