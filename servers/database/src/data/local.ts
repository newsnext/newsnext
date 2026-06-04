import type { Database } from "db0"
import type { NewsNextDatabase } from "./db0"
import { fileURLToPath } from "node:url"
import { createDatabase } from "db0"
import { createDbFromDb0 } from "./db0"

export async function createLocalDb(path: string): Promise<NewsNextDatabase> {
  const db0 = await createDb0Database(path)
  return createDbFromDb0(db0)
}

async function createDb0Database(path: string): Promise<Database> {
  if (!("Bun" in globalThis)) {
    throw new TypeError("NewsNext database requires Bun runtime")
  }

  const { default: createBunSqliteConnector } = await import("db0/connectors/bun-sqlite")
  return createDatabase(createBunSqliteConnector({ path: normalizeSqlitePath(path) }))
}

function normalizeSqlitePath(path: string): string {
  return path.startsWith("file:") ? fileURLToPath(path) : path
}
