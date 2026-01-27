import bunAdapter from "@newsnext/build/adapter/bun"
import cloudflareWorkersAdapter from "@newsnext/build/adapter/cloudflare-workers"
import vercelAdapter from "@newsnext/build/adapter/vercel"
import Build from "@newsnext/build/rolldown"
import { getRuntimeKey } from "hono/adapter"
import { defineConfig } from "tsdown"

function getAdapter() {
  const runtimeKey = getRuntimeKey()
  if (runtimeKey === "edge-light") {
    return vercelAdapter({
      staticPaths: ["public"],
    })
  } else if (runtimeKey === "workerd") {
    return cloudflareWorkersAdapter({
      staticPaths: ["public"],
    })
  }
  return bunAdapter({
    staticRoot: "public",
  })
}

export default defineConfig({
  format: "esm",
  clean: true,
  plugins: [
    Build({
      entry: ["./src/index.ts"],
      output: "index.mjs",
      adapter: getAdapter(),
    }),
  ],
})
