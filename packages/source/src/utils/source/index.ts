import type { Color } from "@newsnext/shared/types"
import type {
  CategoryId,
  InferSourceParams,
  ProviderDefinition,
  RuntimeSource,
  SourceCacheConfig,
  SourceCacheMaxAge,
  SourceCapabilities,
  SourceLoader,
  SourceMetadata,
  SourceParamSchemaMap,
  SourceRadarRule,
  SourceSecretDefinition,
} from "../../typings/sources"
import type { HtmlSourceOptions } from "./html-source"
import type { JsonSourceOptions } from "./json-source"

import { parseSourceParamValue } from "../params"
import { renderTemplates, validateTemplates } from "../template"
import { assertNetworkCapability } from "./capabilities"
import { loadHtml } from "./html-source"
import { loadJson, validateJsonExpression } from "./json-source"
import { loadRss } from "./rss-source"

interface SourceConfigBase<TParams extends SourceParamSchemaMap> extends Omit<SourceMetadata, "key"> {
  params?: TParams
  radar?: SourceRadarRule[]
  cache: SourceCacheConfig | SourceCacheMaxAge
}

type SourceCapabilityOverrides = Partial<SourceCapabilities>

const PARAM_TEMPLATE_ROOTS = ["params"] as const
const PARAM_VALUE_TEMPLATE_ROOTS = ["value"] as const
const FIELD_TEMPLATE_ROOTS = ["index", "item", ...PARAM_TEMPLATE_ROOTS, "requestUrl", "value"] as const
const JSON_FIELD_TEMPLATE_ROOTS = [...FIELD_TEMPLATE_ROOTS, "json"] as const
const RADAR_URL_TEMPLATE_ROOTS = ["hashQuery", "path", "query"] as const
const RADAR_METADATA_TEMPLATE_ROOTS = [
  ...RADAR_URL_TEMPLATE_ROOTS,
  "page",
  ...PARAM_TEMPLATE_ROOTS,
] as const

type IsAny<T> = 0 extends (1 & T) ? true : false

type SourceLoaderOption<TParams extends SourceParamSchemaMap>
  = IsAny<TParams> extends true
    ? (...args: any[]) => Promise<ReturnType<SourceLoader> extends Promise<infer Result> ? Result : never>
    : SourceLoader<TParams>

type StructuredSourceLoaderConfig
  = (
    | ({
      type: "json"
      url: string
      fetchOptions?: NonNullable<JsonSourceOptions["fetchOptions"]>
    } & Omit<JsonSourceOptions, "url" | "type" | "fetchOptions">)
    | ({
      type: "html"
      url: string
      fetchOptions?: NonNullable<HtmlSourceOptions["fetchOptions"]>
    } & Omit<HtmlSourceOptions, "url" | "type" | "fetchOptions">)
    | {
      type: "rss"
      url: string
    }
  )

export type SourceConfig<TParams extends SourceParamSchemaMap = any>
  = SourceConfigBase<TParams> & (
    | {
      loader: StructuredSourceLoaderConfig
      capabilities?: SourceCapabilityOverrides
    }
    | {
      loader: {
        type: "custom"
        load: SourceLoaderOption<TParams>
      }
      capabilities: SourceCapabilityOverrides
    }
  )

export function validateSourceTemplates(sourceId: string, config: SourceConfig): void {
  validateTemplates(config.params, `${sourceId}.params`, {
    allowedRoots: PARAM_VALUE_TEMPLATE_ROOTS,
  })

  if (config.sourceIcon) {
    validateTemplates(config.sourceIcon, `${sourceId}.sourceIcon`, {
      allowedRoots: PARAM_TEMPLATE_ROOTS,
    })
  }

  const { loader } = config
  if (loader.type !== "custom" && typeof loader.url === "string") {
    validateTemplates(loader.url, `${sourceId}.loader.url`, {
      allowedRoots: PARAM_TEMPLATE_ROOTS,
    })
    if (loader.type === "json" || loader.type === "html") {
      validateTemplates(loader.fetchOptions, `${sourceId}.loader.fetchOptions`, {
        allowedRoots: PARAM_TEMPLATE_ROOTS,
      })
    }
  }

  if (loader.type === "json") {
    if (typeof loader.items === "string") {
      validateJsonExpressionAt(loader.items, `${sourceId}.loader.items`)
    }
    validateJsonFieldExpressions(loader.fields, `${sourceId}.loader.fields`)
    validateTemplates(loader.fields, `${sourceId}.loader.fields`, {
      allowedRoots: JSON_FIELD_TEMPLATE_ROOTS,
    })
  } else if (loader.type === "html") {
    validateTemplates(loader.fields, `${sourceId}.loader.fields`, {
      allowedRoots: FIELD_TEMPLATE_ROOTS,
    })
  }

  validateRadarTemplates(config.radar, `${sourceId}.radar`)
}

function validateRadarTemplates(
  rules: SourceRadarRule[] | undefined,
  location: string,
): void {
  rules?.forEach((rule, index) => {
    const patchLocation = `${location}.${index}.patch`
    validateTemplates(rule.patch?.params, `${patchLocation}.params`, {
      allowedRoots: RADAR_URL_TEMPLATE_ROOTS,
    })
    validateTemplates(rule.patch?.metadata, `${patchLocation}.metadata`, {
      allowedRoots: RADAR_METADATA_TEMPLATE_ROOTS,
    })
  })
}

function validateJsonFieldExpressions(value: unknown, location: string): void {
  if (typeof value === "string") {
    validateJsonExpressionAt(value, location)
    return
  }
  if (typeof value === "function" || !value || typeof value !== "object") {
    return
  }

  if ("select" in value || "template" in value) {
    const select = (value as { select?: unknown }).select
    if (typeof select === "string") {
      validateJsonExpressionAt(select, `${location}.select`)
    }
    return
  }

  for (const [key, child] of Object.entries(value)) {
    validateJsonFieldExpressions(child, `${location}.${key}`)
  }
}

function validateJsonExpressionAt(expression: string, location: string): void {
  try {
    validateJsonExpression(expression)
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : ""
    throw new Error(`Invalid JMESPath expression at ${location}${detail}`, { cause: error })
  }
}

type ResolvedSource<TParams extends SourceParamSchemaMap> = Omit<
  RuntimeSource<TParams>,
  "category" | "color" | "providerTitle"
> & Partial<Pick<RuntimeSource<TParams>, "category" | "color" | "providerTitle">>

function resolveSource<const TParams extends SourceParamSchemaMap = Record<string, never>>(
  key: string,
  config: SourceConfig<TParams>,
): ResolvedSource<TParams> {
  const {
    params,
    radar,
    cache: cacheInput,
    loader,
    capabilities: capabilityOverrides,
    ...metadata
  } = config
  const capabilities = resolveSourceCapabilities(loader, params, capabilityOverrides)
  const cache = typeof cacheInput === "string"
    ? { version: 1, maxAge: cacheInput }
    : cacheInput
  const registration = {
    key,
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
          const resolvedUrl = resolveSourceTemplates(url, loaderParams)
          assertNetworkCapability(key, resolvedUrl, capabilities.network)
          return loadJson({
            ...options,
            url: resolvedUrl,
            fetchOptions: fetchOptions === undefined
              ? undefined
              : resolveSourceTemplates(fetchOptions, loaderParams),
            type: metadata.type,
          }, {
            params: loaderParams,
          })
        },
      }
    }
    case "html": {
      const { type: _type, url, fetchOptions, ...options } = loader
      return {
        ...registration,
        loader: async (loaderParams) => {
          const resolvedUrl = resolveSourceTemplates(url, loaderParams)
          assertNetworkCapability(key, resolvedUrl, capabilities.network)
          return loadHtml({
            ...options,
            url: resolvedUrl,
            fetchOptions: fetchOptions === undefined
              ? undefined
              : resolveSourceTemplates(fetchOptions, loaderParams),
            type: metadata.type,
          }, {
            params: loaderParams,
          })
        },
      }
    }
    case "rss": {
      const { url } = loader
      return {
        ...registration,
        loader: async (loaderParams) => {
          const resolvedUrl = resolveSourceTemplates(url, loaderParams)
          assertNetworkCapability(key, resolvedUrl, capabilities.network)
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

export interface ProviderConfig {
  title: string
  color: Color
  icon?: string
  desc?: string
  home?: string
  category?: CategoryId
  secrets?: SourceSecretDefinition[]
  sources: Record<string, SourceConfig>
}

export function resolveProvider(
  id: string,
  provider: ProviderConfig,
): ProviderDefinition {
  for (const [key, config] of Object.entries(provider.sources)) {
    validateSourceTemplates(`${id}:${key}`, config)
  }

  const sources = Object.fromEntries(
    Object.entries(provider.sources).map(([key, config]) => {
      const source = resolveSource(key, config)
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

      return [key, registeredSource]
    }),
  ) as Record<string, RuntimeSource>

  return {
    id,
    title: provider.title,
    color: provider.color,
    icon: provider.icon,
    desc: provider.desc,
    home: provider.home,
    category: provider.category ?? "others",
    sources,
  }
}

function resolveSourceTemplates<TParams extends SourceParamSchemaMap, TValue>(
  option: TValue,
  params: InferSourceParams<TParams>,
): TValue {
  return renderTemplates(option, { params })
}

function resolveDefaultParams<TParams extends SourceParamSchemaMap>(
  params: TParams | undefined,
): InferSourceParams<TParams> {
  return Object.fromEntries(
    Object.entries(params ?? {}).map(([key, param]) => [
      key,
      parseSourceParamValue(param, undefined),
    ]),
  ) as InferSourceParams<TParams>
}

function resolveSourceCapabilities<TParams extends SourceParamSchemaMap>(
  loader: StructuredSourceLoaderConfig | { type: "custom", load: SourceLoader<TParams> },
  params: TParams | undefined,
  overrides: SourceCapabilityOverrides | undefined,
): SourceCapabilities {
  const inferredNetworkHosts: string[] = []

  if (loader.type !== "custom") {
    const defaultParams = resolveDefaultParams(params)
    const requestUrl = resolveSourceTemplates(loader.url, defaultParams)

    inferredNetworkHosts.push(new URL(requestUrl).hostname)
  }

  return {
    network: [...new Set([...inferredNetworkHosts, ...(overrides?.network ?? [])])],
    cookies: [...new Set(overrides?.cookies ?? [])],
    browser: [...new Set(overrides?.browser ?? [])],
  }
}
