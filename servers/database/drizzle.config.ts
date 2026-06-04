import { defineConfig } from "drizzle-kit"
import { DB_PATH } from "./src/paths"

export default defineConfig({
  out: "./drizzle",
  schema: "./src/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: DB_PATH,
  },
  verbose: true,
})
