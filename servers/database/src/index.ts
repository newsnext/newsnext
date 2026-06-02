import type { Database } from "db0"
import { fileURLToPath } from "node:url"
import { createDatabase } from "db0"
import { drizzle as drizzleDb0 } from "db0/integrations/drizzle"
import { drizzle as drizzleD1 } from "drizzle-orm/d1"
import * as schema from "./schema"

export * from "./schema"

export type NewsNextDatabase = ReturnType<typeof drizzleDb0<typeof schema>>

let databasePromise: Promise<NewsNextDatabase> | undefined

export function getDb(): Promise<NewsNextDatabase> {
  databasePromise ??= createBunDatabase()
  return databasePromise
}

export function createD1Db(d1: unknown): NewsNextDatabase {
  return drizzleD1(d1 as never, { schema }) as unknown as NewsNextDatabase
}

async function createBunDatabase(): Promise<NewsNextDatabase> {
  const { DATA_DB_PATH } = await import("../../../data")
  const db0 = await createDb0Database(DATA_DB_PATH)
  return drizzleDb0<typeof schema>(db0)
}

async function createDb0Database(path: string): Promise<Database> {
  if (typeof Bun === "undefined") {
    throw new Error("NewsNext database requires Bun runtime")
  }

  const { default: createBunSqliteConnector } = await import("db0/connectors/bun-sqlite")
  return createDatabase(createBunSqliteConnector({ path: normalizeSqlitePath(path) }))
}

function normalizeSqlitePath(path: string): string {
  return path.startsWith("file:") ? fileURLToPath(path) : path
}
