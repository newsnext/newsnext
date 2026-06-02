async function build() {
  await Bun.$`cd ../../apps/extension && bun run build:web --outDir ../../servers/api/public --emptyOutDir`
}

build().catch((e) => {
  console.error(e)
  process.exit(1)
}).finally(() => {
  process.exit(0)
})
