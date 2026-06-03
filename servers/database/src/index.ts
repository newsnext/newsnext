import type { NewsNextDatabase } from "./d1"
import { DATA_DB_PATH } from "./paths"
import { createSqliteDb } from "./sqlite"

export { createD1Db } from "./d1"
export { createDbFromDb0 } from "./db0"
export { createSqliteDb } from "./sqlite"
export type { NewsNextDatabase } from "./d1"
export * from "./schema"

let databasePromise: Promise<NewsNextDatabase> | undefined

export function getDb(): Promise<NewsNextDatabase> {
  databasePromise ??= createBunDatabase()
  return databasePromise
}

async function createBunDatabase(): Promise<NewsNextDatabase> {
  return createSqliteDb(DATA_DB_PATH)
}
