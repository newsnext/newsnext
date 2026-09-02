import type {
  ProviderConfig,
  SourceRegistryConfig,
} from "@newsnext/source-kit/registry"
import type { RuntimeSource } from "@newsnext/source-kit/types"
import { basename, dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  flattenProviderConfig,
  resolveSourceRegistry,
} from "@newsnext/source-kit/registry"

const rootDir = dirname(fileURLToPath(import.meta.url))
const jsonProviderGlob = new Bun.Glob("src/*.json")
const typescriptProviderGlobs = [
  new Bun.Glob("src/*.ts"),
  new Bun.Glob("src/**/index.ts"),
]
const SRC_PREFIX_REGEX = /^src\//
const TS_EXTENSION_REGEX = /\.ts$/
const TEST_FILE_REGEX = /\.(?:test|spec)\.ts$/

function toJsonSource(value: SourceRegistryConfig): SourceRegistryConfig | undefined {
  try {
    const serialized = JSON.stringify(value, function (_key, child: unknown) {
      if (
        typeof child === "function"
        || typeof child === "symbol"
        || typeof child === "bigint"
        || (typeof child === "number" && !Number.isFinite(child))
        || (child === undefined && Array.isArray(this))
      ) {
        throw new TypeError("Source contains a non-JSON value")
      }
      return child
    })
    return JSON.parse(serialized) as SourceRegistryConfig
  } catch {
    return undefined
  }
}

async function writeIfChanged(path: string, content: string): Promise<void> {
  const file = Bun.file(path)
  const currentContent = await file.exists() ? await file.text() : undefined
  if (currentContent !== content) {
    await file.write(content)
  }
}

async function generate(): Promise<void> {
  const typescriptProviderFiles = new Set<string>()
  for (const glob of typescriptProviderGlobs) {
    for await (const file of glob.scan(rootDir)) {
      if (!TEST_FILE_REGEX.test(file)) {
        typescriptProviderFiles.add(file)
      }
    }
  }

  const registry: Record<string, SourceRegistryConfig> = {}
  function addSource(id: string, source: SourceRegistryConfig): void {
    if (id in registry) {
      throw new Error(`Duplicate source ID "${id}"`)
    }
    registry[id] = source
  }

  const typescriptProviderIds = new Set<string>()
  const executableProviders: Array<{
    importPath: string
    providerId: string
    sourceIds: string[]
  }> = []
  for (const [index, file] of Array.from(typescriptProviderFiles).sort().entries()) {
    const sourcePath = file.replace(SRC_PREFIX_REGEX, "")
    const importPath = `./src/${sourcePath.replace(TS_EXTENSION_REGEX, "")}`
    const pathParts = sourcePath.replace(TS_EXTENSION_REGEX, "").split("/")
    const providerId = pathParts.at(-1) === "index"
      ? pathParts.at(-2)
      : pathParts.at(-1)

    if (!providerId || typescriptProviderIds.has(providerId)) {
      throw new Error(`Duplicate executable provider ID "${providerId ?? ""}"`)
    }
    typescriptProviderIds.add(providerId)

    const providerModule = await import(
      `${join(rootDir, file)}?build=${Date.now()}-${index}`,
    ) as { default: ProviderConfig }
    const flattenedSources = flattenProviderConfig(providerId, providerModule.default)
    const executableSourceIds: string[] = []
    for (const [sourceId, source] of Object.entries(flattenedSources)) {
      const jsonSource = toJsonSource(source)
      if (jsonSource) {
        addSource(sourceId, jsonSource)
      } else {
        executableSourceIds.push(sourceId.slice(providerId.length + 1))
      }
    }
    if (executableSourceIds.length > 0) {
      executableProviders.push({
        importPath,
        providerId,
        sourceIds: executableSourceIds,
      })
    }
  }

  const jsonProviderFiles: string[] = []
  for await (const file of jsonProviderGlob.scan(rootDir)) {
    jsonProviderFiles.push(file)
  }
  for (const file of jsonProviderFiles.sort()) {
    const providerId = basename(file, ".json")
    if (typescriptProviderIds.has(providerId)) {
      throw new Error(`Provider "${providerId}" cannot mix JSON and TypeScript Sources`)
    }
    const provider = await Bun.file(join(rootDir, file)).json() as ProviderConfig
    for (const [id, source] of Object.entries(flattenProviderConfig(providerId, provider))) {
      addSource(id, source)
    }
  }

  const sortedRegistry = Object.fromEntries(
    Object.entries(registry).sort(([left], [right]) => left.localeCompare(right)),
  )
  const serializedRegistry = `${JSON.stringify(sortedRegistry, null, 2)}\n`
  resolveSourceRegistry(JSON.parse(serializedRegistry))
  await writeIfChanged(
    join(rootDir, "registry.json"),
    serializedRegistry,
  )

  const importStatements = executableProviders.map(
    ({ importPath }, index) => `import provider_${index} from "${importPath}"`,
  )
  const providerEntries = executableProviders.map(
    ({ providerId, sourceIds }, index) => {
      const sourceEntries = sourceIds.map(
        sourceId => `      ${JSON.stringify(sourceId)}: provider_${index}.sources[${JSON.stringify(sourceId)}]`,
      )
      return `  ${JSON.stringify(providerId)}: {
    ...provider_${index},
    sources: {
${sourceEntries.join(",\n")}
    },
  }`
    },
  )
  const sourcesPath = join(rootDir, "sources.ts")
  await writeIfChanged(
    sourcesPath,
    `// Auto-generated file - do not edit manually
// This file is generated by build.ts

import type { RuntimeSource } from "@newsnext/source-kit/types"
import type { ProviderConfig } from "@newsnext/source-kit/registry"
import {
  resolveProvider,
  resolveSourceRegistry,
} from "@newsnext/source-kit/registry"
${importStatements.join("\n")}

const providerConfigs: Record<string, ProviderConfig> = {
${providerEntries.join(",\n")}
}

export const typescriptSources: Record<string, RuntimeSource> = Object.fromEntries(
  Object.entries(providerConfigs).flatMap(([providerId, providerConfig]) => {
    const provider = resolveProvider(providerId, providerConfig)
    return Object.entries(provider.sources).map(
      ([sourceId, source]) => [\`\${providerId}:\${sourceId}\`, source],
    )
  }),
)

export function resolveSources(registry: unknown): Record<string, RuntimeSource> {
  const registrySources = resolveSourceRegistry(registry)
  for (const sourceId of Object.keys(typescriptSources)) {
    if (Object.hasOwn(registrySources, sourceId)) {
      throw new Error(\`Duplicate source ID "\${sourceId}"\`)
    }
  }
  return { ...registrySources, ...typescriptSources }
}
`,
  )

  const generatedSources = await import(`${sourcesPath}?updated=${Date.now()}`) as {
    typescriptSources: Record<string, RuntimeSource>
  }
  console.log(`Generated registry.json with ${Object.keys(sortedRegistry).length} sources`)
  console.log(
    `Generated sources.ts with ${Object.keys(generatedSources.typescriptSources).length} executable TypeScript sources`,
  )
}

await generate()
