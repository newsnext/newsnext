import bunAdapter from "@newsnext/build/adapter/bun"
import cloudflareWorkersAdapter from "@newsnext/build/adapter/cloudflare-workers"
import vercelAdapter from "@newsnext/build/adapter/vercel"
import Build from "@newsnext/build/rolldown"

export default {
  format: "esm",
  clean: true,
  plugins: [
    Build({
      entry: ["./src/index.ts"],
      output: "index.mjs",
      // adapter: bunAdapter({
      //   staticRoot: "public",
      // }),
      adapter: cloudflareWorkersAdapter({
        staticRoot: "public",
      }),
      // adapter: vercelAdapter({
      //   vercel: {
      //     function: {
      //       runtime: "bun1.x",
      //       regions: ["hkg1"],
      //     },
      //   },
      // }),
    }),
  ],
}
