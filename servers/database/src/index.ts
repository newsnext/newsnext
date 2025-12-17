import { Database } from "bun:sqlite"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { DATA_DB_PATH } from "../../../data"
import * as schema from "./schema"

const sqlite = new Database(DATA_DB_PATH)
export const db = drizzle(sqlite, { schema })
export * from "./schema"
