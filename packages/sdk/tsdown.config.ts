import { defineConfig } from "tsdown"

export default defineConfig({
  entry: {
    "index": "src/index.ts",
    "runtime": "src/runtime.ts",
    "analytics": "src/analytics.ts",
    "widget": "src/widget.ts",
    "extension": "src/extension.ts",
    "models/index": "src/models/index.ts",
    "source/index": "src/source/index.ts",
    "source/core/index": "src/source/core/index.ts",
    "source/registry/index": "src/source/registry/index.ts",
    "source/runtime/index": "src/source/runtime/index.ts",
    "source/local/index": "src/source/local/index.ts",
    "schemas/index": "src/schemas/index.ts",
    "native-protocol": "src/native-protocol.ts",
    "action/index": "src/action/index.ts",
    "action/client": "src/action/client.ts",
    "action/events": "src/action/events.ts",
  },
  target: "node22",
  dts: { eager: true },
  outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
  deps: { alwaysBundle: ["@newsnext/shared", "@newsnext/date-parser"] },
})
