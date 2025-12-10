import { drizzle } from "drizzle-orm/bun-sqlite"
import "dotenv/config"

export const db = drizzle({ connection: { source: process.env.DB_FILE_NAME! } })