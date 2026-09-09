import { writeFile } from "node:fs/promises"
import packageJson from "./package.json"

async function writePackageManifest(): Promise<void> {
  const exports = Object.fromEntries(Object.entries(packageJson.exports).map(([name, entry]) => [
    name,
    typeof entry === "string"
      ? compiledPath(entry)
      : Object.fromEntries(Object.entries(entry).map(([condition, path]) => [condition, compiledPath(path)])),
  ]))
  await writeFile(new URL("./dist/package.json", import.meta.url), `${JSON.stringify({
    ...packageJson,
    exports,
    files: ["**/*.js", "**/*.d.ts"],
    scripts: undefined,
  }, null, 2)}\n`)
}

function compiledPath(path: string): string {
  return path.replace(/^\.\/src\//, "./").replace(/\.ts$/, ".js")
}

void writePackageManifest()
