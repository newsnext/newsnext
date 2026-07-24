import type {
  InferSourceParams,
  ProviderDefinition,
  ProviderRegistration,
  RuntimeSource,
  SourceCacheConfig,
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
import type { RSSHubLoaderOptions } from "./rss-source"

import { loadHtml } from "./html-source"
import { loadJson } from "./json-source"
import { loadRss, loadRssHub } from "./rss-source"

interface SourceConfigBase<TParams extends SourceParamSchemaMap> {
  metadata: SourceMetadata
  params?: TParams
  radar?: SourceRadarRule[]
  capabilities: SourceCapabilities
  cache: SourceCacheConfig
}

type SourceOption<TParams extends SourceParamSchemaMap, TValue>
  = TValue | ((params: InferSourceParams<TParams>) => TValue)

type SourceLoaderConfig<TParams extends SourceParamSchemaMap, Item>
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
    | ({
      type: "rssHub"
      route: SourceOption<TParams, string>
    } & Omit<RSSHubLoaderOptions, "route" | "type">)
    | {
      type: "custom"
      load: SourceLoader<TParams>
    }
  )

interface SourceConfig<TParams extends SourceParamSchemaMap, Item> extends SourceConfigBase<TParams> {
  loader: SourceLoaderConfig<TParams, Item>
}

export function $source<
  Item = any,
  const TParams extends SourceParamSchemaMap = Record<string, never>,
>(config: SourceConfig<TParams, Item>): SourceRegistration<TParams> {
  const { metadata, params, radar, capabilities, cache, loader } = config
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
        loader: async loaderParams => loadJson({
          ...options,
          url: resolveSourceOption(url, loaderParams),
          fetchOptions: fetchOptions === undefined
            ? undefined
            : resolveSourceOption(fetchOptions, loaderParams),
          type: metadata.type,
        }),
      }
    }
    case "html": {
      const { type: _type, url, fetchOptions, ...options } = loader
      return {
        ...registration,
        loader: async loaderParams => loadHtml({
          ...options,
          url: resolveSourceOption(url, loaderParams),
          fetchOptions: fetchOptions === undefined
            ? undefined
            : resolveSourceOption(fetchOptions, loaderParams),
          type: metadata.type,
        }),
      }
    }
    case "rss": {
      const { url } = loader
      return {
        ...registration,
        loader: async loaderParams => loadRss({
          url: resolveSourceOption(url, loaderParams),
        }),
      }
    }
    case "rssHub": {
      const { type: _type, route, ...options } = loader
      return {
        ...registration,
        loader: async loaderParams => loadRssHub({
          ...options,
          route: resolveSourceOption(route, loaderParams),
          type: metadata.type,
        }),
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
      const registeredSource: RuntimeSource = {
        icon: provider.icon,
        providerTitle: source.providerTitle ?? provider.title,
        key: source.key,
        title: source.title,
        params: source.params,
        capabilities: source.capabilities,
        cache: source.cache,
        color: source.color ?? provider.color,
        desc: source.desc ?? provider.desc,
        type: source.type,
        category: source.category ?? provider.category ?? "others",
        home: source.home ?? provider.home,
        secrets: mergeDefinitions(provider.secrets, source.secrets),
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
