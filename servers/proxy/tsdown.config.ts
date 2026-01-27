import bunAdapter from "@newsnext/build/adapter/bun"
import cloudflareWorkersAdapter from "@newsnext/build/adapter/cloudflare-workers"
import vercelAdapter from "@newsnext/build/adapter/vercel"
import Build from "@newsnext/build/rolldown"
import { defineConfig } from "tsdown"

function getAdapter() {
  console.log(globalThis.navigator?.userAgent)
  if (process.env.VERCEL) {
    console.log("using vercel adapter")
    return vercelAdapter({
      staticPaths: ["public"],
    })
  } else if (globalThis.navigator?.userAgent === "Cloudflare-Workers") {
    console.log("using cloudflare workers adapter")
    return cloudflareWorkersAdapter({
      staticPaths: ["public"],
    })
  }
  console.log("using bun adapter")
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
