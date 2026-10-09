import { defineConfig } from "taze"

export default defineConfig({
  exclude: [
    // Keep parser internals aligned with the versions used by Cheerio.
    "domhandler",
    "entities",
    // Keep TypeScript 6 for ESLint's compiler API compatibility.
    "typescript",
  ],
})
