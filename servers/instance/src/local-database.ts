import { Db0CacheAdapter } from "@newsnext/cache/db0"
import { useDatabase } from "nitro/database"
import { createNewsNextInstance } from "./local"

export async function createNitroDatabaseNewsNextInstance() {
  const isCloudflare = typeof Bun === "undefined"
  return createNewsNextInstance({
    adapter: await Db0CacheAdapter.fromDb0(useDatabase() as never),
    debugInfo: {
      runtime: isCloudflare ? "cloudflare" : "bun",
      cache: {
        type: "db0",
        path: "nitro:database:default",
      },
    },
  })
}
