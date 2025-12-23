import { build as tsdownBuild } from "tsdown"

async function build() {
  await tsdownBuild({
    entry: ["src/index.ts", "src/index.cf.ts"],
    outDir: "dist",
  })
  await Bun.$`cd ../../apps/extension && bun run build:web --outDir ../../servers/api/public --emptyOutDir`
}

build().catch((e) => {
  console.error(e)
  process.exit(1)
}).finally(() => {
  process.exit(0)
})