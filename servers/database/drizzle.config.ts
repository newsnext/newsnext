import { defineConfig } from "drizzle-kit"
import { DATA_DB_PATH } from "./src/data/paths"

export default defineConfig({
  out: "./drizzle",
  schema: "./src/data/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: DATA_DB_PATH,
  },
  verbose: true,
})
