import type {
  InferSourceParams,
  ProviderDefinition,
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
} from "../../typings/sources"
import type { HtmlSourceOptions } from "./html-source"
import type { JsonSourceOptions } from "./json-source"

import { COLORS } from "@newsnext/shared/constants"
import { getFavicon } from "@newsnext/shared/utils"
import { createDefu } from "defu"
import { categories } from "../../typings/sources"
import { parseSourceParamValue } from "../params"
import { renderTemplates, validateTemplates } from "../template"
import { assertNetworkCapability, matchesCapabilityHost } from "./capabilities"
import { loadHtml } from "./html-source"
import { loadJson, validateJsonExpression } from "./json-source"
import { loadRss } from "./rss-source"

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

const assignSourceDefaults = createDefu((object, key, value) => {
  if (Array.isArray(value) && Array.isArray(object[key])) {
    object[key] = value
    return true
  }
})

const BASE_SOURCE_DEFAULTS: SourceConfigDefaults = {
  metadata: {
    category: "others",
  },
}

function mergeSourceContexts(
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

export interface ProviderConfig {
  title: string
  defaults?: SourceConfigDefaults
  sources: Record<string, ProviderSourceConfig>
}

export type SourceRegistryConfig = SourceConfig & {
  provider: SourceProvider
}

export type SourceRegistry = Record<string, SourceRegistryConfig>

export const SOURCE_REGISTRY_LIMITS = {
  maxBytes: 2 * 1024 * 1024,
  maxSources: 1000,
  maxSourceIdLength: 200,
  maxRequestRulesPerSource: 10,
  maxRequestDomainsPerRule: 20,
  maxRequestHeadersPerRule: 5,
} as const

const REGISTRY_SOURCE_ID_PATTERN = /^[^:\s]+:[^:\s]+$/
const REQUEST_DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i
const REQUEST_RULE_ACTION_TYPES = new Set([
  "allow",
  "allowAllRequests",
  "block",
  "modifyHeaders",
  "redirect",
  "upgradeScheme",
])
const REQUEST_HEADER_OPERATIONS = new Set(["append", "remove", "set"])
const PROHIBITED_REGISTRY_KEYS = new Set(["__proto__", "constructor", "prototype"])
const STRUCTURED_LOADER_TYPES = new Set(["html", "json", "rss"])
const PROVIDER_CONFIG_KEYS = new Set(["defaults", "sources", "title"])
const SOURCE_PROVIDER_KEYS = new Set(["title"])
const SOURCE_COLORS = new Set<string>(COLORS)
const SOURCE_CATEGORIES = new Set(Object.keys(categories))

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isValidIdSegment(value: string): boolean {
  return Boolean(value) && !/[:\s]/.test(value) && !PROHIBITED_REGISTRY_KEYS.has(value)
}

function hasSourceProviderIdentity(value: unknown): value is SourceProvider {
  return isRecord(value)
    && typeof value.title === "string"
    && value.title.trim().length > 0
}

function isSourceProvider(value: unknown): value is SourceProvider {
  return hasSourceProviderIdentity(value)
    && Object.keys(value).every(key => SOURCE_PROVIDER_KEYS.has(key))
}

function toSourceProvider(provider: ProviderConfig): SourceProvider {
  return {
    title: provider.title,
  }
}

function validateSourceRequestRules(
  sourceKey: string,
  requestRules: unknown,
  declaredHosts: readonly string[],
): void {
  if (requestRules === undefined) {
    return
  }
  if (!Array.isArray(requestRules) || requestRules.length > SOURCE_REGISTRY_LIMITS.maxRequestRulesPerSource) {
    throw new Error(`Source "${sourceKey}" has invalid request rules`)
  }

  requestRules.forEach((rule, ruleIndex) => {
    if (!isRecord(rule)) {
      throw new Error(`Source "${sourceKey}" request rule ${ruleIndex} must be an object`)
    }

    const { action, condition, priority } = rule
    if (!isRecord(action) || !REQUEST_RULE_ACTION_TYPES.has(String(action.type))) {
      throw new Error(`Source "${sourceKey}" request rule ${ruleIndex} has an invalid action`)
    }
    if (!isRecord(condition)) {
      throw new Error(`Source "${sourceKey}" request rule ${ruleIndex} has an invalid condition`)
    }
    if (
      priority !== undefined
      && (!Number.isInteger(priority) || typeof priority !== "number" || priority < 1)
    ) {
      throw new Error(`Source "${sourceKey}" request rule ${ruleIndex} has an invalid priority`)
    }

    const { requestDomains } = condition
    if (
      !Array.isArray(requestDomains)
      || requestDomains.length === 0
      || requestDomains.length > SOURCE_REGISTRY_LIMITS.maxRequestDomainsPerRule
    ) {
      throw new Error(`Source "${sourceKey}" request rule ${ruleIndex} has invalid request domains`)
    }
    for (const domain of requestDomains) {
      if (
        typeof domain !== "string"
        || !REQUEST_DOMAIN_PATTERN.test(domain)
        || !declaredHosts.some(host => matchesCapabilityHost(domain, host))
      ) {
        throw new Error(
          `Source "${sourceKey}" request rule ${ruleIndex} uses undeclared domain "${String(domain)}"`,
        )
      }
    }

    if (action.type === "modifyHeaders") {
      const requestHeaders = action.requestHeaders
      const responseHeaders = action.responseHeaders
      const headerModifications = [
        ...(Array.isArray(requestHeaders) ? requestHeaders : []),
        ...(Array.isArray(responseHeaders) ? responseHeaders : []),
      ]
      if (
        headerModifications.length === 0
        || headerModifications.length > SOURCE_REGISTRY_LIMITS.maxRequestHeadersPerRule
      ) {
        throw new Error(`Source "${sourceKey}" request rule ${ruleIndex} has invalid header modifications`)
      }
      headerModifications.forEach((header, headerIndex) => {
        if (
          !isRecord(header)
          || typeof header.header !== "string"
          || header.header.length === 0
          || !REQUEST_HEADER_OPERATIONS.has(String(header.operation))
          || (
            header.operation !== "remove"
            && (
              typeof header.value !== "string"
              || header.value.length > 2048
              || /[\r\n]/.test(header.value)
            )
          )
        ) {
          throw new Error(
            `Source "${sourceKey}" request rule ${ruleIndex} header ${headerIndex} is invalid`,
          )
        }
      })
    }
  })
}

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
      const idParts = id.split(":")
      if (
        id.length > SOURCE_REGISTRY_LIMITS.maxSourceIdLength
        || !REGISTRY_SOURCE_ID_PATTERN.test(id)
        || idParts.some(part => PROHIBITED_REGISTRY_KEYS.has(part))
      ) {
        throw new Error(`Invalid registry source ID "${id}"`)
      }
      if (!isRecord(source) || !isRecord(source.loader)) {
        throw new Error(`Registry source "${id}" must define a structured loader`)
      }
      if (!isSourceProvider(source.provider)) {
        throw new Error(`Registry source "${id}" has invalid provider metadata`)
      }

      const providerId = idParts[0] as string
      const currentProvider = source.provider
      const previousProvider = providers.get(providerId)
      if (
        previousProvider
        && previousProvider.title !== currentProvider.title
      ) {
        throw new Error(`Provider "${providerId}" has inconsistent metadata`)
      }
      providers.set(providerId, currentProvider)

      if (!STRUCTURED_LOADER_TYPES.has(String(source.loader.type))) {
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
  const unsupportedKey = Object.keys(provider).find(key => !PROVIDER_CONFIG_KEYS.has(key))
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
                !STRUCTURED_LOADER_TYPES.has(String(defaultedSource.loader.type))
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
      if (!SOURCE_COLORS.has(String(defaultedSource.metadata?.color))) {
        throw new Error(`Source "${sourceKey}" is missing a valid color`)
      }
      if (!SOURCE_CATEGORIES.has(String(defaultedSource.metadata?.category))) {
        throw new Error(`Source "${sourceKey}" has an invalid category`)
      }

      return [sourceId, {
        ...defaultedSource,
        context: mergeSourceContexts(provider.defaults?.context, source.context),
      } as SourceConfig]
    }),
  )
}

function resolveRuntimeSource(
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

export function resolveRegistrySource(
  id: string,
  config: SourceRegistryConfig,
): RuntimeSource {
  const key = id.split(":")[1]
  if (!key) {
    throw new Error(`Invalid registry source ID "${id}"`)
  }

  return resolveRuntimeSource(id, key, config, config.provider)
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
