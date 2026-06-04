import type { NewsNextDatabase } from "./db0"
import { DB_PATH } from "../paths"
import { createLocalDb } from "./local"

export { createDbFromDb0 } from "./db0"
export type { NewsNextDatabase } from "./db0"
export { createLocalDb } from "./local"
export * from "./schema"

let databasePromise: Promise<NewsNextDatabase> | undefined

export function getDb(): Promise<NewsNextDatabase> {
  databasePromise ??= createBunDatabase()
  return databasePromise
}

async function createBunDatabase(): Promise<NewsNextDatabase> {
  return createLocalDb(DB_PATH)
}
