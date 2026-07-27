import type {
  InferSourceParams,
  RuntimeSource,
  SourceCacheConfig,
  SourceCacheMaxAge,
  SourceCapabilities,
  SourceLoader,
  SourceMetadata,
  SourceParamSchemaMap,
  SourceProvider,
  SourceRadarRule,
  SourceRequestRule,
  SourceSecretDefinition,
  SourceTemplateContext,
  SourceTemplateContextValue,
} from "../types"
import type { HtmlSourceOptions } from "./loaders/html"
import type { JsonSourceOptions } from "./loaders/json"

import { COLORS } from "@newsnext/shared/constants"
import { getFavicon } from "@newsnext/shared/utils"
import { createDefu } from "defu"
import { categories } from "../types"
import { assertNetworkCapability, validateSourceRequestRules } from "./capabilities"
import { loadHtml } from "./loaders/html"
import { loadJson, validateJsonExpression } from "./loaders/json"
import { loadRss } from "./loaders/rss"
import { parseSourceParamValue } from "./params"
import { renderTemplates, validateTemplates } from "./template"

interface SourceConfigBase<TParams extends SourceParamSchemaMap> {
  metadata?: Omit<SourceMetadata, "key">
  context?: SourceTemplateContext
  params?: TParams
  radar?: SourceRadarRule[]
  requestRules?: readonly SourceRequestRule[]
  secrets?: SourceSecretDefinition[]
  cache: SourceCacheConfig | SourceCacheMaxAge
}

type SourceCapabilityOverrides = Partial<SourceCapabilities>
type SourceCacheInput = SourceCacheConfig | SourceCacheMaxAge
type ProviderSourceMetadata = Omit<SourceMetadata, "key">
type ProviderSourceLoader<TParams extends SourceParamSchemaMap> = Partial<
  SourceConfig<TParams>["loader"]
>

const PARAM_TEMPLATE_ROOTS = ["params"] as const
const LOADER_TEMPLATE_ROOTS = ["context", ...PARAM_TEMPLATE_ROOTS] as const
const PARAM_VALUE_TEMPLATE_ROOTS = ["value"] as const
const FIELD_TEMPLATE_ROOTS = ["context", "index", "item", ...PARAM_TEMPLATE_ROOTS, "requestUrl", "value"] as const
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

export type SourceConfigDefaults<TParams extends SourceParamSchemaMap = any> = Partial<
  Omit<SourceConfig<TParams>, "loader" | "metadata">
> & {
  loader?: ProviderSourceLoader<TParams>
  metadata?: ProviderSourceMetadata
}

export type ProviderSourceConfig<TParams extends SourceParamSchemaMap = any> = Omit<
  SourceConfig<TParams>,
  "cache" | "capabilities" | "loader" | "metadata"
> & {
  cache?: SourceCacheInput
  capabilities?: SourceCapabilityOverrides
  loader?: ProviderSourceLoader<TParams>
  metadata?: ProviderSourceMetadata
}

export function validateSourceTemplates(sourceId: string, config: SourceConfig): void {
  validateSourceContext(config.context, `${sourceId}.context`)
  validateTemplates(config.params, `${sourceId}.params`, {
    allowedRoots: PARAM_VALUE_TEMPLATE_ROOTS,
  })

  if (config.metadata?.icon) {
    validateTemplates(config.metadata.icon, `${sourceId}.metadata.icon`, {
      allowedRoots: PARAM_TEMPLATE_ROOTS,
    })
  }

  const { loader } = config
  if (loader.type !== "custom" && typeof loader.url === "string") {
    validateTemplates(loader.url, `${sourceId}.loader.url`, {
      allowedRoots: LOADER_TEMPLATE_ROOTS,
    })
    if (loader.type === "json" || loader.type === "html") {
      validateTemplates(loader.fetchOptions, `${sourceId}.loader.fetchOptions`, {
        allowedRoots: LOADER_TEMPLATE_ROOTS,
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

function validateSourceContext(
  context: unknown,
  location: string,
): void {
  if (context === undefined) {
    return
  }
  if (!isRecord(context)) {
    throw new TypeError(`${location} must be an object`)
  }

  validateSourceContextValue(context, location)
}

function validateSourceContextValue(value: unknown, location: string): void {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
    || (typeof value === "number" && Number.isFinite(value))
  ) {
    return
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) => validateSourceContextValue(child, `${location}.${index}`))
    return
  }
  if (isRecord(value)) {
    Object.entries(value).forEach(([key, child]) => {
      validateSourceContextValue(child, `${location}.${key}`)
    })
    return
  }
  throw new TypeError(`${location} must contain only serializable values`)
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
  "category" | "color" | "provider"
> & Partial<Pick<RuntimeSource<TParams>, "category" | "color">>

function resolveSource<const TParams extends SourceParamSchemaMap = Record<string, never>>(
  key: string,
  config: SourceConfig<TParams>,
): ResolvedSource<TParams> {
  const {
    context,
    params,
    radar,
    requestRules,
    secrets,
    cache: cacheInput,
    loader,
    capabilities: capabilityOverrides,
    metadata = {},
  } = config
  const capabilities = resolveSourceCapabilities(loader, params, context, capabilityOverrides)
  validateSourceRequestRules(key, requestRules, capabilities.network)
  const cache = typeof cacheInput === "string"
    ? { version: 1, maxAge: cacheInput }
    : cacheInput
  const icon = metadata.icon ?? (metadata.home ? getFavicon(metadata.home) : undefined)
  const registration = {
    key,
    ...metadata,
    icon,
    params,
    radar,
    requestRules,
    secrets,
    capabilities,
    cache,
  }

  switch (loader.type) {
    case "json": {
      const { type: _type, url, fetchOptions, ...options } = loader
      return {
        ...registration,
        loader: async (loaderParams) => {
          const resolvedUrl = resolveSourceTemplates(url, loaderParams, context)
          assertNetworkCapability(key, resolvedUrl, capabilities.network)
          return loadJson({
            ...options,
            url: resolvedUrl,
            fetchOptions: fetchOptions === undefined
              ? undefined
              : resolveSourceTemplates(fetchOptions, loaderParams, context),
            type: metadata.type,
          }, {
            context,
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
          const resolvedUrl = resolveSourceTemplates(url, loaderParams, context)
          assertNetworkCapability(key, resolvedUrl, capabilities.network)
          return loadHtml({
            ...options,
            url: resolvedUrl,
            fetchOptions: fetchOptions === undefined
              ? undefined
              : resolveSourceTemplates(fetchOptions, loaderParams, context),
            type: metadata.type,
          }, {
            context,
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
          const resolvedUrl = resolveSourceTemplates(url, loaderParams, context)
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

export const assignSourceDefaults = createDefu((object, key, value) => {
  if (Array.isArray(value) && Array.isArray(object[key])) {
    object[key] = value
    return true
  }
})

export const BASE_SOURCE_DEFAULTS: SourceConfigDefaults = {
  metadata: {
    category: "others",
  },
}

export function mergeSourceContexts(
  providerContext: SourceTemplateContext | undefined,
  sourceContext: SourceTemplateContext | undefined,
): SourceTemplateContext | undefined {
  return mergeSourceContextValues(providerContext, sourceContext) as
    | SourceTemplateContext
    | undefined
}

function mergeSourceContextValues(
  defaultValue: SourceTemplateContextValue | undefined,
  sourceValue: SourceTemplateContextValue | undefined,
): SourceTemplateContextValue | undefined {
  if (sourceValue === undefined) {
    return defaultValue
  }
  if (!isRecord(defaultValue) || !isRecord(sourceValue)) {
    return sourceValue
  }

  const keys = new Set([...Object.keys(defaultValue), ...Object.keys(sourceValue)])
  const merged: Record<string, SourceTemplateContextValue> = {}
  for (const key of keys) {
    const value = mergeSourceContextValues(
      defaultValue[key] as SourceTemplateContextValue | undefined,
      sourceValue[key] as SourceTemplateContextValue | undefined,
    )
    if (value !== undefined) {
      merged[key] = value
    }
  }
  return merged
}

const SOURCE_COLORS = new Set<string>(COLORS)
const SOURCE_CATEGORIES = new Set(Object.keys(categories))

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function resolveRuntimeSource(
  id: string,
  key: string,
  config: SourceConfig,
  provider: SourceProvider,
): RuntimeSource {
  validateSourceTemplates(id, config)

  const source = resolveSource(key, config)
  const category = source.category
  if (
    !source.color
    || !category
    || !SOURCE_COLORS.has(source.color)
    || !SOURCE_CATEGORIES.has(category)
  ) {
    throw new Error(`Source "${id}" is missing valid display metadata`)
  }

  const secrets = source.secrets
  const cookieHosts = (secrets ?? [])
    .filter(secret => secret.type === "cookie")
    .map(secret => new URL(secret.origin).hostname)

  return {
    ...source,
    provider,
    color: source.color,
    category,
    secrets,
    capabilities: {
      ...source.capabilities,
      cookies: [...new Set([...source.capabilities.cookies, ...cookieHosts])],
    },
  }
}

function resolveSourceTemplates<TParams extends SourceParamSchemaMap, TValue>(
  option: TValue,
  params: InferSourceParams<TParams>,
  context?: SourceTemplateContext,
): TValue {
  return renderTemplates(option, { context: context ?? {}, params })
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
  context: SourceTemplateContext | undefined,
  overrides: SourceCapabilityOverrides | undefined,
): SourceCapabilities {
  const inferredNetworkHosts: string[] = []

  if (loader.type !== "custom") {
    const defaultParams = resolveDefaultParams(params)
    const requestUrl = resolveSourceTemplates(loader.url, defaultParams, context)

    inferredNetworkHosts.push(new URL(requestUrl).hostname)
  }

  return {
    network: [...new Set([...inferredNetworkHosts, ...(overrides?.network ?? [])])],
    cookies: [...new Set(overrides?.cookies ?? [])],
    browser: [...new Set(overrides?.browser ?? [])],
  }
}
