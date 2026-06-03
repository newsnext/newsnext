import { SqliteCacheAdapter } from "@newsnext/cache/sqlite"
import { createNewsNextInstance } from "./local"

export async function createSqliteNewsNextInstance(path: string) {
  return createNewsNextInstance({
    adapter: await SqliteCacheAdapter.create(path),
    debugInfo: {
      runtime: "bun",
      cache: {
        type: "sqlite",
        path,
      },
    },
  })
}
