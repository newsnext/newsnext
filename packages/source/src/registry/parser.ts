import type { RuntimeSource, SourceProvider } from "../types"
import type { SourceRegistry, SourceRegistryConfig } from "./types"
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
    entries.map(([id, source]) => {
      const [providerId] = parseRegistrySourceId(id)
      if (!isRecord(source) || !isRecord(source.loader)) {
        throw new Error(`Registry source "${id}" must define a structured loader`)
      }
      if (!isSourceProvider(source.provider)) {
        throw new Error(`Registry source "${id}" has invalid provider metadata`)
      }

      const currentProvider = source.provider
      const previousProvider = providers.get(providerId)
      if (previousProvider && previousProvider.title !== currentProvider.title) {
        throw new Error(`Provider "${providerId}" has inconsistent metadata`)
      }
      providers.set(providerId, currentProvider)

      if (!isStructuredLoaderType(source.loader.type)) {
        throw new Error(`Registry source "${id}" uses an unsupported loader type`)
      }

      const config = source as unknown as SourceRegistryConfig
      resolveRegistrySource(id, config)
      return [id, config]
    }),
  )
}

export function mergeSourceRegistries(...registries: unknown[]): SourceRegistry {
  return parseSourceRegistry(
    Object.assign({}, ...registries.map(parseSourceRegistry)),
  )
}

export function resolveSourceRegistry(input: unknown): Record<string, RuntimeSource> {
  return Object.fromEntries(
    Object.entries(parseSourceRegistry(input)).map(([id, source]) => [
      id,
      resolveRegistrySource(id, source),
    ]),
  )
}

export function resolveRegistrySource(
  id: string,
  config: SourceRegistryConfig,
): RuntimeSource {
  const [, key] = parseRegistrySourceId(id)
  return resolveRuntimeSource(id, key, config, config.provider)
}
