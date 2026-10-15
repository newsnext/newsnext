import { readdir } from "node:fs/promises"
import { basename, dirname, extname, join } from "node:path"
import { fileURLToPath } from "node:url"
import * as sourceHelpers from "@newsnext/sdk/source"
import { resolveProvider } from "@newsnext/sdk/source/registry"

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const rootDir = join(webRoot, "../registry")

// Registry modules use the SDK supplied by this host, without a package install.
Bun.plugin({
  name: "registry-sdk",
  setup(build) {
    build.module("@newsnext/sdk/source", () => ({ exports: sourceHelpers, loader: "object" }))
  },
})
const ID_PATTERN = /^[\w-]+$/
const TEST_FILE_REGEX = /\.(?:test|spec)\.[cm]?js$/

async function validate(): Promise<void> {
  let sourceCount = 0
  const providers = new Set<string>()
  const entries = await readdir(join(rootDir, "sources"), { withFileTypes: true })
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    if (entry.name.startsWith(".") || TEST_FILE_REGEX.test(entry.name)) continue
    let path = `sources/${entry.name}`
    let id = entry.name
    if (entry.isDirectory()) {
      const modules: string[] = []
      for (const name of ["index.js", "index.mjs"]) {
        if (await Bun.file(join(rootDir, path, name)).exists()) modules.push(name)
      }
      if (modules.length !== 1) throw new Error(`Expected one Source entry in '${path}'`)
      path += `/${modules[0]}`
    } else {
      if (!entry.isFile() || ![".json", ".js", ".mjs"].includes(extname(path))) continue
      id = basename(path, extname(path))
    }
    if (!ID_PATTERN.test(id)) throw new Error(`Invalid registry ID "${id}"`)
    if (providers.has(id)) throw new Error(`Duplicate provider ID "${id}"`)
    try {
      const module = await import(join(rootDir, path)) as { default: unknown }
      sourceCount += Object.keys(resolveProvider(id, module.default).sources).length
    } catch (error) {
      throw new Error(`Invalid Source provider '${path}'`, { cause: error })
    }
    providers.add(id)
  }
  console.log(`Validated ${providers.size} Providers and ${sourceCount} Sources`)
}

await validate()
