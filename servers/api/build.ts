import { getRuntimeKey } from "hono/adapter"

const isServerless = getRuntimeKey() === "edge-light" || getRuntimeKey() === "workerd"

async function build() {
  await Bun.build({
    entrypoints: ["src/index.ts"],
    minify: false,
    target: isServerless ? "browser" : "bun",
    outdir: "dist",
  })
  await Bun.$`cd ../../apps/extension && bun run build:web --outDir ../../servers/api/public --emptyOutDir`
}

build().catch((e) => {
  console.error(e)
  process.exit(1)
}).finally(() => {
  process.exit(0)
})