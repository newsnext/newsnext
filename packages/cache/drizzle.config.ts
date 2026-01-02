import { defineConfig } from "drizzle-kit"
import { CACHE_DB_PATH } from "../../data"

export default defineConfig({
  out: "./drizzle",
  schema: "./src/adapters/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: CACHE_DB_PATH,
  },
  verbose: true,
})