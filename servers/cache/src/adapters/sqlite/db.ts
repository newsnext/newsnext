import { Database } from "bun:sqlite"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { DB_PATH } from "../../../path"
import * as schema from "./schema"

const sqlite = new Database(DB_PATH, { create: true })
export const db = drizzle(sqlite, { schema })
export * from "./schema"
