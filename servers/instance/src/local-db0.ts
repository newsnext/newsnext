import { Db0CacheAdapter } from "@newsnext/cache/db0"
import { createLocalCacheDb0 } from "@newsnext/database/cache/local"
import { createNewsNextInstance } from "./local"

export async function createDb0NewsNextInstance(path: string) {
  return createNewsNextInstance({
    adapter: await Db0CacheAdapter.fromDb0(await createLocalCacheDb0(path)),
    debugInfo: {
      runtime: "bun",
      cache: {
        type: "db0",
        path,
      },
    },
  })
}
