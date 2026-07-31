import type { SourceConfig } from "../core/resolver"
import type { ProviderDefinition, RuntimeSource, SourceProvider } from "../types"
import type { ProviderConfig, SourceRegistry } from "./types"
import {
  assignSourceDefaults,
  mergeSourceVars,
  resolveRuntimeSource,
  validateSourceTemplates,
} from "../core/resolver"
import {
  hasValidSourceProviderMetadata,
  isRecord,
  isStructuredLoaderType,
  isSupportedProviderKey,
  isValidIdSegment,
} from "./validation"

export function flattenProviderConfig(
  providerId: string,
  provider: ProviderConfig,
): SourceRegistry {
  const sources = expandProviderSources(providerId, provider)
  const providerMetadata = toSourceProvider(provider)

  return Object.fromEntries(
    Object.entries(sources).map(([sourceId, source]) => [
      `${providerId}:${sourceId}`,
      {
        ...source,
        provider: providerMetadata,
      },
    ]),
  )
}

export function resolveProvider(
  providerId: string,
  provider: ProviderConfig,
): ProviderDefinition {
  const sourcesConfig = expandProviderSources(providerId, provider)
  const providerMetadata = toSourceProvider(provider)

  const sources = Object.fromEntries(
    Object.entries(sourcesConfig).map(([sourceId, config]) => [
      sourceId,
      resolveRuntimeSource(`${providerId}:${sourceId}`, config, providerMetadata),
    ]),
  ) as Record<string, RuntimeSource>

  return {
    sources,
  }
}

function expandProviderSources(
  providerId: string,
  provider: ProviderConfig,
): Record<string, SourceConfig> {
  if (!isValidIdSegment(providerId)) {
    throw new Error(`Invalid provider ID "${providerId}"`)
  }
  if (!isRecord(provider)) {
    throw new Error(`Provider "${providerId}" must be an object`)
  }
  const unsupportedKey = Object.keys(provider).find(key => !isSupportedProviderKey(key))
  if (unsupportedKey) {
    throw new Error(`Provider "${providerId}" has unsupported property "${unsupportedKey}"`)
  }
  if (!hasValidSourceProviderMetadata(provider)) {
    throw new Error(`Provider "${providerId}" has invalid metadata`)
  }
  if (provider.defaults !== undefined && !isRecord(provider.defaults)) {
    throw new Error(`Provider "${providerId}" has invalid defaults`)
  }
  if (!isRecord(provider.sources)) {
    throw new Error(`Provider "${providerId}" must define sources`)
  }

  return Object.fromEntries(
    Object.entries(provider.sources).map(([sourceId, source]) => {
      if (!isValidIdSegment(sourceId)) {
        throw new Error(`Provider "${providerId}" has invalid source ID "${sourceId}"`)
      }
      if (!isRecord(source)) {
        throw new Error(`Source "${providerId}:${sourceId}" must be an object`)
      }
      const defaultedSource = assignSourceDefaults(
        source,
        provider.defaults ?? {},
      )
      const fullSourceId = `${providerId}:${sourceId}`
      if (
        !isRecord(defaultedSource.loader)
        || (
          defaultedSource.loader.type === "custom"
            ? typeof defaultedSource.loader.load !== "function"
            : (
                !isStructuredLoaderType(defaultedSource.loader.type)
                || !("url" in defaultedSource.loader)
                || typeof defaultedSource.loader.url !== "string"
                || defaultedSource.loader.url.length === 0
              )
        )
      ) {
        throw new Error(`Source "${fullSourceId}" is missing a valid loader`)
      }
      if (!defaultedSource.cache) {
        throw new Error(`Source "${fullSourceId}" is missing a cache policy`)
      }
      validateSourceTemplates(fullSourceId, defaultedSource as SourceConfig)
      return [sourceId, {
        ...defaultedSource,
        vars: mergeSourceVars(provider.defaults?.vars, source.vars),
      } as SourceConfig]
    }),
  )
}

function toSourceProvider(provider: ProviderConfig): SourceProvider {
  return {
    title: provider.title,
    category: provider.category,
    icon: provider.icon,
    color: provider.color,
  }
}
