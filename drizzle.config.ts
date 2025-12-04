import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./schema.ts",
  out: "./migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: "./database.sqlite",
  },
})