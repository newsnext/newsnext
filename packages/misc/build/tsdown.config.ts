import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["./src/*.ts", "./src/adapter/*/index.ts"],
  inlineOnly: [],
  exports: true,
})
