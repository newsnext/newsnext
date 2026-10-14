import { defineConfig } from "tsdown"

export default defineConfig({
  entry: {
    "index": "src/index.ts",
    "runtime": "src/runtime.ts",
    "analytics": "src/analytics.ts",
    "widget": "src/widget.ts",
    "extension": "src/extension.ts",
    "models/index": "src/models/index.ts",
    "native-protocol": "src/native-protocol.ts",
    "action/index": "src/action/index.ts",
  },
  target: "node22",
  dts: { eager: true },
  outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
  deps: { alwaysBundle: ["@newsnext/shared"] },
})
