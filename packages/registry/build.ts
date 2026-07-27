import type { ProviderConfig, SourceRegistryConfig } from "@newsnext/source/registry"
import { basename, dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { flattenProviderConfig, resolveSourceRegistry } from "@newsnext/source/registry"

const rootDir = dirname(fileURLToPath(import.meta.url))
const sourceGlob = new Bun.Glob("src/*.json")

async function writeIfChanged(path: string, content: string): Promise<void> {
  const file = Bun.file(path)
  const currentContent = await file.exists() ? await file.text() : undefined
  if (currentContent !== content) {
    await file.write(content)
  }
}

async function generate(): Promise<void> {
  const files: string[] = []
  for await (const file of sourceGlob.scan(rootDir)) {
    files.push(file)
  }
  files.sort()

  const registry: Record<string, SourceRegistryConfig> = {}
  for (const file of files) {
    const providerId = basename(file, ".json")
    const provider = await Bun.file(join(rootDir, file)).json() as ProviderConfig
    Object.assign(registry, flattenProviderConfig(providerId, provider))
  }
  resolveSourceRegistry(registry)

  await writeIfChanged(
    join(rootDir, "registry.json"),
    `${JSON.stringify(registry, null, 2)}\n`,
  )
  console.log("Generated registry.json with sources:", Object.keys(registry))
}

await generate()
