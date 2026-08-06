import { defineConfig } from "taze"

export default defineConfig({
  exclude: [
    // Keep parser internals aligned with the versions used by Cheerio.
    "domhandler",
    "entities",
    // Keep the compatibility TypeScript toolchain pinned to the selected version.
    "typescript",
  ],
})
