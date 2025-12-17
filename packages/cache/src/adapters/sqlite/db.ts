import { Database } from "bun:sqlite"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { CACHE_DB_PATH } from "../../../../../data"
import * as schema from "./schema"

const sqlite = new Database(CACHE_DB_PATH, { create: true })
export const db = drizzle(sqlite, { schema })
export * from "./schema"
