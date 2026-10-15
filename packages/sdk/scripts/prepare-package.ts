import { copyFile, readFile, writeFile } from "node:fs/promises"

// Keep workspace imports on source; publish the compiled package from dist.
const root = new URL("../", import.meta.url)
const manifest = JSON.parse(await readFile(new URL("package.json", root), "utf8"))
const workspace = JSON.parse(await readFile(new URL("../../package.json", root), "utf8"))

function compiledExport(path: string): { types: string, default: string } {
  const entry = path.replace(/^\.\/src\//, "./").replace(/\.ts$/, "")
  return { types: `${entry}.d.ts`, default: `${entry}.js` }
}

const exports = Object.fromEntries(
  Object.entries(manifest.exports as Record<string, string | { browser: string, default: string }>).map(([key, value]) => [
    key,
    typeof value === "string"
      ? compiledExport(value)
      : { browser: compiledExport(value.browser), ...compiledExport(value.default) },
  ]),
)
const dependencies = Object.fromEntries(
  Object.entries(manifest.dependencies as Record<string, string>)
    .filter(([, version]) => !version.startsWith("workspace:"))
    .map(([name, version]) => [name, version === "catalog:" ? workspace.workspaces.catalog[name] : version]),
)

await writeFile(new URL("dist/package.json", root), `${JSON.stringify({
  name: manifest.name,
  version: manifest.version,
  type: manifest.type,
  description: manifest.description,
  license: manifest.license,
  sideEffects: manifest.sideEffects,
  engines: manifest.engines,
  publishConfig: { access: "public", tag: "alpha" },
  exports,
  files: ["**/*.js", "**/*.d.ts", "LICENSE"],
  dependencies,
}, null, 2)}\n`)
await copyFile(new URL("../../LICENSE", root), new URL("dist/LICENSE", root))
