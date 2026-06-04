import type { Database } from "db0"
import { fileURLToPath } from "node:url"
import { createDatabase } from "db0"

export async function createLocalCacheDb0(path: string): Promise<Database> {
  if (typeof Bun === "undefined") {
    throw new TypeError("SQLite cache requires Bun runtime")
  }

  const { default: createBunSqliteConnector } = await import("db0/connectors/bun-sqlite")
  return createDatabase(createBunSqliteConnector({ path: normalizeSqlitePath(path) }))
}

function normalizeSqlitePath(path: string): string {
  return path.startsWith("file:") ? fileURLToPath(path) : path
}
