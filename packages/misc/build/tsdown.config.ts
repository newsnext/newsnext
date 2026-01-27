import { defineConfig } from "tsdown"

export default defineConfig({
  entry: [
    "./src/index.ts",
    "./src/adapters/*/index.ts",
  ],
  inlineOnly: [],
  exports: true,
})
