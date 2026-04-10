import type { Adapter } from "@newsnext/build"
import type { UserConfig } from "tsdown"
import Build from "@newsnext/build"
import bunAdapter from "@newsnext/build/adapters/bun"
import cloudflareWorkersAdapter from "@newsnext/build/adapters/cloudflare-workers"
import vercelAdapter from "@newsnext/build/adapters/vercel"
import { defineConfig } from "tsdown"

const INLINE_ALL_EXTERNAL_REGEX = /.*/

function getAdapter(): { config?: UserConfig, adapter: Adapter } {
  if (process.env.VERCEL) {
    console.log("Using adapter: Vercel")
    return {
      config: {
        noExternal: [INLINE_ALL_EXTERNAL_REGEX],
        outputOptions: {
          inlineDynamicImports: true,
        },
      },
      adapter: vercelAdapter({
        function: {
          runtime: "bun1.x",
        },
      }),
    }
  } else if (process.env.WORKERS_CI) {
    console.log("Using adapter: Cloudflare Workers")
    return {
      adapter: cloudflareWorkersAdapter(),
    }
  }
  console.log("Using adapter: Bun")
  return {
    adapter: bunAdapter({
      staticRoot: "public",
    }),
  }
}

const { config, adapter } = getAdapter()
export default defineConfig({
  format: "esm",
  clean: true,
  ...config,
  plugins: [
    Build({
      entry: ["./src/index.ts"],
      output: "index.mjs",
      adapter,
    }),
  ],
})
