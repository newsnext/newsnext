import type { RuntimeSource, SourceProvider } from "../types"
import type {
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
  assertJsonValue(input, "Source registry", new WeakSet())

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

      if (!isRecord(source.loader) || !isStructuredLoaderType(source.loader.type)) {
        throw new Error(`Registry source "${sourceId}" uses an unsupported loader type`)
      }

      const config = source as unknown as SourceRegistryConfig
      resolveRegistrySource(sourceId, config)
      return [sourceId, config]
    }),
  )
}

function assertJsonValue(
  value: unknown,
  location: string,
  ancestors: WeakSet<object>,
): void {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
    || (typeof value === "number" && Number.isFinite(value))
  ) {
    return
  }
  if (typeof value !== "object" || ancestors.has(value)) {
    throw new Error(`${location} must contain only JSON values`)
  }

  ancestors.add(value)
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertJsonValue(item, `${location}.${index}`, ancestors))
  } else {
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`${location} must contain only JSON values`)
    }
    Object.entries(value).forEach(([key, item]) => (
      assertJsonValue(item, `${location}.${key}`, ancestors)
    ))
  }
  ancestors.delete(value)
}

export function mergeSourceRegistries(...registries: unknown[]): SourceRegistry {
  return parseSourceRegistry(
    Object.assign({}, ...registries.map(parseSourceRegistry)),
  )
}

export function resolveSourceRegistry(
  input: unknown,
): Record<string, RuntimeSource> {
  return Object.fromEntries(
    Object.entries(parseSourceRegistry(input)).map(([sourceId, source]) => [
      sourceId,
      resolveRegistrySource(sourceId, source),
    ]),
  )
}

export function resolveRegistrySource(
  sourceId: string,
  config: SourceRegistryConfig,
): RuntimeSource {
  parseRegistrySourceId(sourceId)
  return resolveRuntimeSource(sourceId, config, config.provider)
}
