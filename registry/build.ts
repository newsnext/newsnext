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
  validateJsonSourceManifest,
} from "@newsnext/source-kit/registry"

const rootDir = dirname(fileURLToPath(import.meta.url))
const jsonProviderGlob = new Bun.Glob("src/*.json")
const executableProviderGlobs = [
  new Bun.Glob("src/*.js"),
  new Bun.Glob("src/**/index.js"),
]
const SRC_PREFIX_REGEX = /^src\//
const SCRIPT_EXTENSION_REGEX = /\.js$/
const TEST_FILE_REGEX = /\.(?:test|spec)\.js$/

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

async function scanSourceFiles(glob: Bun.Glob): Promise<string[]> {
  const files: string[] = []
  for await (const file of glob.scan(rootDir)) {
    // Glob.scan yields platform-specific separators; normalize to POSIX so
    // generated imports and provider IDs are stable across platforms.
    files.push(file.replaceAll("\\", "/"))
  }
  return files
}

async function generate(): Promise<void> {
  const executableProviderFiles = new Set<string>()
  for (const glob of executableProviderGlobs) {
    for (const file of await scanSourceFiles(glob)) {
      if (!TEST_FILE_REGEX.test(file)) {
        executableProviderFiles.add(file)
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

  const executableProviderIds = new Set<string>()
  const executableProviders: Array<{
    importPath: string
    providerId: string
    sourceIds: string[]
  }> = []
  for (const [index, file] of Array.from(executableProviderFiles).sort().entries()) {
    const sourcePath = file.replace(SRC_PREFIX_REGEX, "")
    const importPath = `./${file}`
    const pathParts = sourcePath.replace(SCRIPT_EXTENSION_REGEX, "").split("/")
    const providerId = pathParts.at(-1) === "index"
      ? pathParts.at(-2)
      : pathParts.at(-1)

    if (!providerId || executableProviderIds.has(providerId)) {
      throw new Error(`Duplicate executable provider ID "${providerId ?? ""}"`)
    }
    executableProviderIds.add(providerId)

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

  const jsonProviderFiles = await scanSourceFiles(jsonProviderGlob)
  for (const file of jsonProviderFiles.sort()) {
    const providerId = basename(file, ".json")
    if (executableProviderIds.has(providerId)) {
      throw new Error(`Provider "${providerId}" cannot mix JSON and executable Sources`)
    }
    const provider: unknown = await Bun.file(join(rootDir, file)).json()
    validateJsonSourceManifest(provider, file)
    for (const [id, source] of Object.entries(flattenProviderConfig(providerId, provider as ProviderConfig))) {
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
  const sourcesPath = join(rootDir, "sources.js")
  await writeIfChanged(
    sourcesPath,
    `// Auto-generated file - do not edit manually
// This file is generated by build.ts

import {
  resolveProvider,
  resolveSourceRegistry,
} from "@newsnext/source-kit/registry"
${importStatements.join("\n")}

const providerConfigs = {
${providerEntries.join(",\n")}
}

export const executableSources = Object.fromEntries(
  Object.entries(providerConfigs).flatMap(([providerId, providerConfig]) => {
    const provider = resolveProvider(providerId, providerConfig)
    return Object.entries(provider.sources).map(
      ([sourceId, source]) => [\`\${providerId}:\${sourceId}\`, source],
    )
  }),
)

export function resolveSources(registry) {
  const registrySources = resolveSourceRegistry(registry)
  for (const sourceId of Object.keys(executableSources)) {
    if (Object.hasOwn(registrySources, sourceId)) {
      throw new Error(\`Duplicate source ID "\${sourceId}"\`)
    }
  }
  return { ...registrySources, ...executableSources }
}
`,
  )

  await writeIfChanged(join(rootDir, "sources.d.ts"), `// Auto-generated file - do not edit manually
import type { RuntimeSource } from "@newsnext/source-kit/types"

export declare const executableSources: Record<string, RuntimeSource>
export declare function resolveSources(registry: unknown): Record<string, RuntimeSource>
`)

  const generatedSources = await import(`${sourcesPath}?updated=${Date.now()}`) as {
    executableSources: Record<string, RuntimeSource>
  }
  console.log(`Generated registry.json with ${Object.keys(sortedRegistry).length} sources`)
  console.log(
    `Generated sources.js with ${Object.keys(generatedSources.executableSources).length} executable sources`,
  )
}

await generate()
