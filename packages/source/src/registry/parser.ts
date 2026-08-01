import type { SourceConfig } from "../core/resolver"
import type { RuntimeSource, SourceProvider } from "../types"
import type {
  ExecutableSourceLoaders,
  SourceRegistry,
  SourceRegistryConfig,
} from "./types"
import { SOURCE_REGISTRY_LIMITS } from "../core/limits"
import { resolveRuntimeSource } from "../core/resolver"
import {
  isRecord,
  isSourceProvider,
  isStructuredLoaderType,
  parseRegistrySourceId,
} from "./validation"

export function parseSourceRegistry(input: unknown): SourceRegistry {
  if (!isRecord(input)) {
    throw new Error("Source registry must be a JSON object")
  }

  const serialized = JSON.stringify(input)
  if (new TextEncoder().encode(serialized).byteLength > SOURCE_REGISTRY_LIMITS.maxBytes) {
    throw new Error(`Source registry exceeds ${SOURCE_REGISTRY_LIMITS.maxBytes} bytes`)
  }

  const entries = Object.entries(input)
  if (entries.length > SOURCE_REGISTRY_LIMITS.maxSources) {
    throw new Error(`Source registry exceeds ${SOURCE_REGISTRY_LIMITS.maxSources} sources`)
  }

  const providers = new Map<string, SourceProvider>()
  return Object.fromEntries(
    entries.map(([sourceId, source]) => {
      const [providerId] = parseRegistrySourceId(sourceId)
      if (!isRecord(source)) {
        throw new Error(`Registry source "${sourceId}" must be an object`)
      }
      if (!isSourceProvider(source.provider)) {
        throw new Error(`Registry source "${sourceId}" has invalid provider metadata`)
      }

      const currentProvider = source.provider
      const previousProvider = providers.get(providerId)
      if (
        previousProvider
        && (
          previousProvider.title !== currentProvider.title
          || previousProvider.category !== currentProvider.category
          || previousProvider.icon !== currentProvider.icon
          || previousProvider.color !== currentProvider.color
        )
      ) {
        throw new Error(`Provider "${providerId}" has inconsistent metadata`)
      }
      providers.set(providerId, currentProvider)

      if (
        source.loader !== undefined
        && (
          !isRecord(source.loader)
          || !isStructuredLoaderType(source.loader.type)
        )
      ) {
        throw new Error(`Registry source "${sourceId}" uses an unsupported loader type`)
      }

      const config = source as unknown as SourceRegistryConfig
      resolveRegistrySource(
        sourceId,
        config,
        config.loader === undefined
          ? { [sourceId]: async () => ({ items: [] }) }
          : {},
      )
      return [sourceId, config]
    }),
  )
}

export function mergeSourceRegistries(...registries: unknown[]): SourceRegistry {
  return parseSourceRegistry(
    Object.assign({}, ...registries.map(parseSourceRegistry)),
  )
}

export function resolveSourceRegistry(
  input: unknown,
  executableLoaders: ExecutableSourceLoaders = {},
): Record<string, RuntimeSource> {
  return Object.fromEntries(
    Object.entries(parseSourceRegistry(input)).map(([sourceId, source]) => [
      sourceId,
      resolveRegistrySource(sourceId, source, executableLoaders),
    ]),
  )
}

export function resolveRegistrySource(
  sourceId: string,
  config: SourceRegistryConfig,
  executableLoaders: ExecutableSourceLoaders = {},
): RuntimeSource {
  parseRegistrySourceId(sourceId)
  if (config.loader === undefined) {
    const load = executableLoaders[sourceId]
    if (!load) {
      throw new Error(`Registry source "${sourceId}" requires an executable loader`)
    }
    if (!isRecord(config.capabilities)) {
      throw new Error(`Registry source "${sourceId}" with an executable loader must define capabilities`)
    }
    const executableConfig = {
      ...config,
      loader: {
        type: "custom",
        load,
      },
    } as SourceConfig
    return resolveRuntimeSource(sourceId, executableConfig, config.provider)
  }

  return resolveRuntimeSource(sourceId, config as SourceConfig, config.provider)
}
