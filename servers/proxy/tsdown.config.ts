import bunAdapter from "@newsnext/build/adapter/bun"
import cloudflareWorkersAdapter from "@newsnext/build/adapter/cloudflare-workers"
import vercelAdapter from "@newsnext/build/adapter/vercel"
import Build from "@newsnext/build/rolldown"
import { defineConfig } from "tsdown"

function getAdapter() {
  if (process.env.VERCEL) {
    console.log("Using adapter: Vercel")
    return vercelAdapter({
      vercel: {
        function: {
          runtime: "bun1.x",
        },
      },
    })
  } else if (process.env.WORKERS_CI) {
    console.log("Using adapter: Cloudflare Workers")
    return cloudflareWorkersAdapter()
  }
  console.log("Using adapter: Bun")
  return bunAdapter({
    staticRoot: "public",
  })
}

export default defineConfig({
  format: "esm",
  clean: true,
  // noExternal: [/.*/],
  // outputOptions: {
  //   inlineDynamicImports: true,
  // },
  plugins: [
    Build({
      entry: ["./src/index.ts"],
      output: "index.mjs",
      adapter: getAdapter(),
    }),
  ],
})
