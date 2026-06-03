import { defineConfig } from "drizzle-kit"
import { DATA_DB_PATH } from "./src/paths"

export default defineConfig({
  out: "./drizzle",
  schema: "./src/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: DATA_DB_PATH,
  },
  verbose: true,
})
