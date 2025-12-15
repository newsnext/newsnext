import { Database } from "bun:sqlite"
import { drizzle } from "drizzle-orm/bun-sqlite"
import * as schema from "./schema"
import "dotenv/config"

const sqlite = new Database(process.env.DB_PATH!)
export const db = drizzle(sqlite, { schema })
export * from "./schema"
