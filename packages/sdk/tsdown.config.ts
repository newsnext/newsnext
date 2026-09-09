import { defineConfig } from "tsdown"

export default defineConfig({
  entry: {
    "index": "src/index.ts",
    "widget": "src/widget.ts",
    "models/index": "src/models/index.ts",
    "action/index": "src/action/index.ts",
  },
  target: "node22",
  dts: { eager: true },
  outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
  deps: { alwaysBundle: ["@newsnext/shared"] },
})
