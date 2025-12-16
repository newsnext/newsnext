import { defineConfig } from "drizzle-kit"
import { DB_PATH } from "./path"

export default defineConfig({
  out: "./drizzle",
  schema: "./src/adapters/sqlite/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: DB_PATH,
  },
  verbose: true,
})