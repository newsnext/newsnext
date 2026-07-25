import type {
  InferSourceParams,
  ProviderDefinition,
  ProviderRegistration,
  RuntimeSource,
  SourceCacheConfig,
  SourceCacheMaxAge,
  SourceCapabilities,
  SourceLoader,
  SourceMetadata,
  SourceParamSchemaMap,
  SourceRadarRule,
  SourceRegistration,
  SourceSecretDefinition,
} from "../../typings/sources"
import type { HtmlSourceOptions } from "./html-source"
import type { JsonSourceOptions } from "./json-source"

import { assertNetworkCapability } from "./capabilities"
import { loadHtml } from "./html-source"
import { loadJson } from "./json-source"
import { loadRss } from "./rss-source"

interface SourceConfigBase<TParams extends SourceParamSchemaMap> {
  metadata: SourceMetadata
  params?: TParams
  radar?: SourceRadarRule[]
  cache: SourceCacheConfig | SourceCacheMaxAge
}

type SourceCapabilityOverrides = Partial<SourceCapabilities>

type SourceOption<TParams extends SourceParamSchemaMap, TValue>
  = TValue | ((params: InferSourceParams<TParams>) => TValue)

type StructuredSourceLoaderConfig<TParams extends SourceParamSchemaMap, Item>
  = (
    | ({
      type: "json"
      url: SourceOption<TParams, string>
      fetchOptions?: SourceOption<TParams, NonNullable<JsonSourceOptions<Item>["fetchOptions"]>>
    } & Omit<JsonSourceOptions<Item>, "url" | "type" | "fetchOptions">)
    | ({
      type: "html"
      url: SourceOption<TParams, string>
      fetchOptions?: SourceOption<TParams, NonNullable<HtmlSourceOptions["fetchOptions"]>>
    } & Omit<HtmlSourceOptions, "url" | "type" | "fetchOptions">)
    | {
      type: "rss"
      url: SourceOption<TParams, string>
    }
  )

type SourceConfig<TParams extends SourceParamSchemaMap, Item>
  = SourceConfigBase<TParams> & (
    | {
      loader: StructuredSourceLoaderConfig<TParams, Item>
      capabilities?: SourceCapabilityOverrides
    }
    | {
      loader: {
        type: "custom"
        load: SourceLoader<TParams>
      }
      capabilities: SourceCapabilityOverrides
    }
  )

export function $source<
  Item = any,
  const TParams extends SourceParamSchemaMap = Record<string, never>,
>(config: SourceConfig<TParams, Item>): SourceRegistration<TParams> {
  const { metadata, params, radar, cache: cacheInput, loader } = config
  const capabilityOverrides = config.capabilities
  const capabilities = resolveSourceCapabilities(loader, params, capabilityOverrides)
  const cache = typeof cacheInput === "string"
    ? { version: 1, maxAge: cacheInput }
    : cacheInput
  const registration = {
    ...metadata,
    params,
    radar,
    capabilities,
    cache,
  }

  switch (loader.type) {
    case "json": {
      const { type: _type, url, fetchOptions, ...options } = loader
      return {
        ...registration,
        loader: async (loaderParams) => {
          const resolvedUrl = resolveSourceOption(url, loaderParams)
          assertNetworkCapability(metadata.key, resolvedUrl, capabilities.network)
          return loadJson({
            ...options,
            url: resolvedUrl,
            fetchOptions: fetchOptions === undefined
              ? undefined
              : resolveSourceOption(fetchOptions, loaderParams),
            type: metadata.type,
          })
        },
      }
    }
    case "html": {
      const { type: _type, url, fetchOptions, ...options } = loader
      return {
        ...registration,
        loader: async (loaderParams) => {
          const resolvedUrl = resolveSourceOption(url, loaderParams)
          assertNetworkCapability(metadata.key, resolvedUrl, capabilities.network)
          return loadHtml({
            ...options,
            url: resolvedUrl,
            fetchOptions: fetchOptions === undefined
              ? undefined
              : resolveSourceOption(fetchOptions, loaderParams),
            type: metadata.type,
          })
        },
      }
    }
    case "rss": {
      const { url } = loader
      return {
        ...registration,
        loader: async (loaderParams) => {
          const resolvedUrl = resolveSourceOption(url, loaderParams)
          assertNetworkCapability(metadata.key, resolvedUrl, capabilities.network)
          return loadRss({ url: resolvedUrl })
        },
      }
    }
    case "custom":
      return {
        ...registration,
        loader: loader.load,
      }
  }

  throw new Error(`Unsupported source loader: ${(loader as { type?: unknown }).type}`)
}

function mergeDefinitions<T extends SourceSecretDefinition>(
  providerDefinitions: T[] | undefined,
  sourceDefinitions: T[] | undefined,
): T[] | undefined {
  if (!providerDefinitions?.length) {
    return sourceDefinitions
  }
  if (!sourceDefinitions?.length) {
    return providerDefinitions
  }
  return [...providerDefinitions, ...sourceDefinitions]
}

export function $provider(
  provider: ProviderRegistration,
): ProviderDefinition {
  const sources = Object.fromEntries(
    provider.sources.map((source) => {
      const secrets = mergeDefinitions(provider.secrets, source.secrets)
      const cookieHosts = (secrets ?? [])
        .filter(secret => secret.type === "cookie")
        .map(secret => new URL(secret.origin).hostname)
      const registeredSource: RuntimeSource = {
        icon: provider.icon,
        providerTitle: source.providerTitle ?? provider.title,
        sourceIcon: source.sourceIcon,
        key: source.key,
        title: source.title,
        params: source.params,
        capabilities: {
          ...source.capabilities,
          cookies: [...new Set([...source.capabilities.cookies, ...cookieHosts])],
        },
        cache: source.cache,
        color: source.color ?? provider.color,
        desc: source.desc ?? provider.desc,
        type: source.type,
        category: source.category ?? provider.category ?? "others",
        home: source.home ?? provider.home,
        secrets,
        radar: source.radar,
        disable: source.disable,
        loader: source.loader,
      }

      return [source.key, registeredSource]
    }),
  ) as Record<string, RuntimeSource>

  return {
    id: provider.id,
    title: provider.title,
    color: provider.color,
    icon: provider.icon,
    desc: provider.desc,
    home: provider.home,
    category: provider.category ?? "others",
    sources,
  }
}

function resolveSourceOption<TParams extends SourceParamSchemaMap, TValue>(
  option: SourceOption<TParams, TValue>,
  params: InferSourceParams<TParams>,
): TValue {
  return typeof option === "function"
    ? (option as (params: InferSourceParams<TParams>) => TValue)(params)
    : option
}

function resolveDefaultParams<TParams extends SourceParamSchemaMap>(
  params: TParams | undefined,
): InferSourceParams<TParams> {
  return Object.fromEntries(
    Object.entries(params ?? {}).map(([key, param]) => [
      key,
      param.parse ? param.parse(param.default) : param.default,
    ]),
  ) as InferSourceParams<TParams>
}

function resolveSourceCapabilities<TParams extends SourceParamSchemaMap, Item>(
  loader: StructuredSourceLoaderConfig<TParams, Item> | { type: "custom", load: SourceLoader<TParams> },
  params: TParams | undefined,
  overrides: SourceCapabilityOverrides | undefined,
): SourceCapabilities {
  const inferredNetworkHosts: string[] = []

  if (loader.type !== "custom") {
    const defaultParams = resolveDefaultParams(params)
    const requestUrl = resolveSourceOption(loader.url, defaultParams)

    inferredNetworkHosts.push(new URL(requestUrl).hostname)
  }

  return {
    network: [...new Set([...inferredNetworkHosts, ...(overrides?.network ?? [])])],
    cookies: [...new Set(overrides?.cookies ?? [])],
    browser: [...new Set(overrides?.browser ?? [])],
  }
}
