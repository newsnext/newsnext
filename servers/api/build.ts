import { isServerless } from "./src"

async function build() {
  await Bun.build({
    entrypoints: ["src/index.ts"],
    minify: true,
    target: isServerless ? "node" : "bun",
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