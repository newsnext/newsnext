import { defineConfig } from "nitro"

export default defineConfig({
  apiDir: "./src/api",
  database: {
  },
  devDatabase: {
    default: {
      connector: "bun-sqlite",
    },
  },
  experimental: {
    database: true,
  },
})
