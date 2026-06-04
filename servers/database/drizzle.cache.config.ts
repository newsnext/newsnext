import { defineConfig } from "drizzle-kit"
import { CACHE_DB_PATH } from "./src/cache/paths"

export default defineConfig({
  out: "./drizzle-cache",
  schema: "./src/cache/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: CACHE_DB_PATH,
  },
  verbose: true,
})
