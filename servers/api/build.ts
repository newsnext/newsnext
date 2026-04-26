import { build as tsdownBuild } from "tsdown"

async function build() {
  await tsdownBuild({
    entry: ["src/index.ts"],
    outDir: "dist",
    outExtensions: () => ({
      js: ".js",
    }),
    clean: true,
  })

  // await Bun.build({
  //   entrypoints: ["src/index.bun.ts"],
  //   outdir: "dist",
  //   target: "bun",
  //   bytecode: true,
  // })

  await Bun.$`cd ../../apps/extension && bun run build:web --outDir ../../servers/api/public --emptyOutDir`
}

build().catch((e) => {
  console.error(e)
  process.exit(1)
}).finally(() => {
  process.exit(0)
})