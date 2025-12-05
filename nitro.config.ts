import { defineConfig } from "nitro"

export default defineConfig({
  apiDir: "./src/api",
  database: {
  },
  preset: "bun",
  devDatabase: {
    default: {
      connector: "bun-sqlite",
    },
  },
  experimental: {
    database: true,
  },
})
