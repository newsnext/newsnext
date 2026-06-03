import type { NewsNextDatabase } from "@newsnext/database/d1"
import { createDbFromDb0 } from "@newsnext/database/db0"
import { useDatabase } from "nitro/database"

let databasePromise: Promise<NewsNextDatabase> | undefined

export function getApiDatabase(): Promise<NewsNextDatabase> {
  databasePromise ??= createDbFromDb0(useDatabase())
  return databasePromise
}
