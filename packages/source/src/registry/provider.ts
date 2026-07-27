import type { SourceConfig } from "../core/resolver"
import type { ProviderDefinition, RuntimeSource, SourceProvider } from "../types"
import type { ProviderConfig, SourceRegistry } from "./types"
import {
  assignSourceDefaults,
  BASE_SOURCE_DEFAULTS,
  mergeSourceContexts,
  resolveRuntimeSource,
} from "../core/resolver"
import {
  hasSourceProviderIdentity,
  isRecord,
  isSourceCategory,
  isSourceColor,
  isStructuredLoaderType,
  isSupportedProviderKey,
  isValidIdSegment,
} from "./validation"

export function flattenProviderConfig(
  id: string,
  provider: ProviderConfig,
): SourceRegistry {
  const sources = expandProviderSources(id, provider)
  const providerMetadata = toSourceProvider(provider)

  return Object.fromEntries(
    Object.entries(sources).map(([sourceId, source]) => [
      `${id}:${sourceId}`,
      {
        ...source,
        provider: providerMetadata,
      },
    ]),
  )
}

export function resolveProvider(
  id: string,
  provider: ProviderConfig,
): ProviderDefinition {
  const sourcesConfig = expandProviderSources(id, provider)
  const providerMetadata = toSourceProvider(provider)

  const sources = Object.fromEntries(
    Object.entries(sourcesConfig).map(([key, config]) => [
      key,
      resolveRuntimeSource(`${id}:${key}`, key, config, providerMetadata),
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
  if (!hasSourceProviderIdentity(provider)) {
    throw new Error(`Provider "${providerId}" has invalid identity metadata`)
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
        BASE_SOURCE_DEFAULTS,
      )
      const sourceKey = `${providerId}:${sourceId}`
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
        throw new Error(`Source "${sourceKey}" is missing a valid loader`)
      }
      if (!defaultedSource.cache) {
        throw new Error(`Source "${sourceKey}" is missing a cache policy`)
      }
      if (!isSourceColor(defaultedSource.metadata?.color)) {
        throw new Error(`Source "${sourceKey}" is missing a valid color`)
      }
      if (!isSourceCategory(defaultedSource.metadata?.category)) {
        throw new Error(`Source "${sourceKey}" has an invalid category`)
      }

      return [sourceId, {
        ...defaultedSource,
        context: mergeSourceContexts(provider.defaults?.context, source.context),
      } as SourceConfig]
    }),
  )
}

function toSourceProvider(provider: ProviderConfig): SourceProvider {
  return {
    title: provider.title,
  }
}
