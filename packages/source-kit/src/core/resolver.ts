import type {
  InferSourceParams,
  RuntimeSource,
  SourceCapabilities,
  SourceLoader,
  SourceLoaderDefinition,
  SourceLoaderOutput,
  SourceParamSchemaMap,
  SourcePresentationMetadata,
  SourceProvider,
  SourceRadarRule,
  SourceRequestRule,
  SourceSecretDefinition,
  SourceTemplateVars,
  SourceTemplateVarValue,
} from "../types"
import type { HtmlLoaderOptions } from "./loaders/html"
import type { JsonLoaderOptions } from "./loaders/json"

import { createDefu } from "defu"
import { isSourcePresentationMetadataKey, isSourcePresentationType } from "../types"
import {
  parseSourceBaseUrl,
  resolveSourceLoaderResultUrls,
  resolveSourceMetadataUrls,
  resolveSourceUrl,
} from "./base-url"
import { assertNetworkCapability, validateSourceRequestRules } from "./capabilities"
import { validateSourceLoaderResult } from "./loader-result"
import {
  compileHtmlLoaderTemplates,
  loadHtml,
} from "./loaders/html"
import {
  compileJsonLoaderTemplates,
  loadJson,
  validateJsonExpression,
} from "./loaders/json"
import { loadRss } from "./loaders/rss"
import { validateSortByTimestamp } from "./loaders/shared"
import { parseSourceParamValue, validateSourceParamDefinitions } from "./params"
import { validateRadarRules } from "./radar"
import {
  compileSourceTemplateValue,
  createSourceTemplateScope,
  isTemplate,
} from "./template"

interface SourceConfigBase<TParams extends SourceParamSchemaMap> {
  version?: number
  baseUrl?: string
  metadata?: SourcePresentationMetadata
  vars?: SourceTemplateVars
  params?: TParams
  radar?: SourceRadarRule[]
  requestRules?: readonly SourceRequestRule[]
  secrets?: SourceSecretDefinition[]
}

type SourceCapabilityOverrides = Partial<SourceCapabilities>
type ProviderLoaderConfig<TParams extends SourceParamSchemaMap> = Partial<
  SourceConfig<TParams>["loader"]
>

type IsAny<T> = 0 extends (1 & T) ? true : false

type CustomLoaderFunction<TParams extends SourceParamSchemaMap>
  = IsAny<TParams> extends true
    ? (...args: any[]) => Promise<SourceLoaderOutput>
    : SourceLoaderDefinition<TParams>

type StructuredLoaderConfig
  = (
    | ({
      type: "json"
    } & Omit<JsonLoaderOptions, "type">)
    | ({
      type: "html"
    } & Omit<HtmlLoaderOptions, "type">)
    | {
      type: "rss"
      url: string
    }
  )

export type SourceConfig<TParams extends SourceParamSchemaMap = any>
  = SourceConfigBase<TParams> & (
    | {
      loader: StructuredLoaderConfig
      capabilities?: SourceCapabilityOverrides
    }
    | {
      loader: {
        type: "custom"
        load: CustomLoaderFunction<TParams>
      }
      capabilities?: SourceCapabilityOverrides
    }
  )

export type SourceConfigDefaults<TParams extends SourceParamSchemaMap = any> = Partial<
  Omit<SourceConfig<TParams>, "loader" | "metadata">
> & {
  loader?: ProviderLoaderConfig<TParams>
  metadata?: SourcePresentationMetadata
}

export type ProviderSourceConfig<TParams extends SourceParamSchemaMap = any> = Omit<
  SourceConfig<TParams>,
  "capabilities" | "loader" | "metadata"
> & {
  capabilities?: SourceCapabilityOverrides
  loader?: ProviderLoaderConfig<TParams>
  metadata?: SourcePresentationMetadata
}

export function validateSourceTemplates(sourceId: string, config: SourceConfig): void {
  if (config.baseUrl !== undefined) {
    parseSourceBaseUrl(config.baseUrl, `${sourceId}.baseUrl`)
  }
  validateSourceVars(config.vars, `${sourceId}.vars`)
  validateSourceMetadata(config.metadata, `${sourceId}.metadata`)

  const { loader } = config
  if (loader.type !== "custom" && typeof loader.url === "string") {
    compileSourceTemplateValue(loader.url, {
      location: `${sourceId}.loader.url`,
      slot: "request",
    })
    if (loader.type === "json" || loader.type === "html") {
      compileSourceTemplateValue(
        loader.fetchOptions,
        {
          location: `${sourceId}.loader.fetchOptions`,
          slot: "request",
        },
      )
    }
  }

  if (loader.type === "json") {
    validateSortByTimestamp(
      loader.sortByTimestamp,
      `${sourceId}.loader.sortByTimestamp`,
    )
    if (typeof loader.items === "string") {
      validateJsonExpressionAt(loader.items, `${sourceId}.loader.items`)
    }
    validateJsonFieldExpressions(loader.fields, `${sourceId}.loader.fields`)
    validateJsonFieldExpressions(loader.metadata, `${sourceId}.loader.metadata`)
    compileJsonLoaderTemplates(loader, `${sourceId}.loader`)
  } else if (loader.type === "html") {
    validateSortByTimestamp(
      loader.sortByTimestamp,
      `${sourceId}.loader.sortByTimestamp`,
    )
    compileHtmlLoaderTemplates(loader, `${sourceId}.loader`)
  }

  validateRadarRules(config.radar, `${sourceId}.radar`)
}

function validateSourceMetadata(
  metadata: SourceConfig["metadata"],
  location: string,
): void {
  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (!isSourcePresentationMetadataKey(key)) {
      throw new TypeError(`${location}.${key} is not supported`)
    }
    if (key === "type" && !isSourcePresentationType(value)) {
      throw new TypeError(`${location}.type must be "list" or "ranking"`)
    }
    if (typeof value === "string" && isTemplate(value)) {
      throw new TypeError(
        `Liquid templates are not allowed at ${location}.${key}; use a Radar metadata patch for dynamic values`,
      )
    }
  }
}

function validateSourceVars(
  vars: unknown,
  location: string,
): void {
  if (vars === undefined) {
    return
  }
  if (!isRecord(vars)) {
    throw new TypeError(`${location} must be an object`)
  }

  validateSourceVarValue(vars, location)
}

function validateSourceVarValue(value: unknown, location: string): void {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
    || (typeof value === "number" && Number.isFinite(value))
  ) {
    return
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) => validateSourceVarValue(child, `${location}.${index}`))
    return
  }
  if (isRecord(value)) {
    Object.entries(value).forEach(([key, child]) => {
      validateSourceVarValue(child, `${location}.${key}`)
    })
    return
  }
  throw new TypeError(`${location} must contain only serializable values`)
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
  "provider"
>

function resolveSource<const TParams extends SourceParamSchemaMap = Record<string, never>>(
  sourceId: string,
  config: SourceConfig<TParams>,
): ResolvedSource<TParams> {
  const {
    version: versionInput,
    baseUrl: baseUrlInput,
    vars,
    params,
    radar,
    requestRules,
    secrets,
    loader,
    capabilities: capabilityOverrides,
    metadata = {},
  } = config
  validateSourceParamDefinitions(params, `${sourceId}.params`)
  const baseUrl = baseUrlInput === undefined
    ? undefined
    : parseSourceBaseUrl(baseUrlInput, `${sourceId}.baseUrl`)
  const resolvedMetadata = resolveSourceMetadataUrls(metadata, baseUrl)
  const capabilities = resolveSourceCapabilities(
    sourceId,
    loader,
    params,
    vars,
    baseUrl,
    capabilityOverrides,
  )
  validateSourceRequestRules(sourceId, requestRules, capabilities.network)
  const version = resolveSourceVersion(versionInput, `${sourceId}.version`)

  let resolvedLoader: SourceLoaderDefinition<TParams>
  switch (loader.type) {
    case "json": {
      const { type: _type, url, fetchOptions, request, ...options } = loader
      const urlTemplate = compileSourceTemplateValue(url, {
        location: `${sourceId}.loader.url`,
        slot: "request",
      })
      const fetchOptionsTemplate = fetchOptions === undefined
        ? undefined
        : compileSourceTemplateValue(fetchOptions, {
            location: `${sourceId}.loader.fetchOptions`,
            slot: "request",
          })
      resolvedLoader = async (loaderParams, context) => {
        const scope = createSourceTemplateScope(vars, { params: loaderParams })
        const resolvedUrl = resolveSourceUrl(urlTemplate.render(scope), baseUrl)
        assertNetworkCapability(sourceId, resolvedUrl, capabilities.network)
        const loaderOptions: JsonLoaderOptions = request
          ? { ...options, url: resolvedUrl, request }
          : {
              ...options,
              url: resolvedUrl,
              fetchOptions: fetchOptionsTemplate?.render(scope),
            }
        return loadJson(loaderOptions, {
          fetch: context.fetch,
          vars,
          params: loaderParams,
          signal: context.signal,
        })
      }
      break
    }
    case "html": {
      const { type: _type, url, fetchOptions, request, ...options } = loader
      const urlTemplate = compileSourceTemplateValue(url, {
        location: `${sourceId}.loader.url`,
        slot: "request",
      })
      const fetchOptionsTemplate = fetchOptions === undefined
        ? undefined
        : compileSourceTemplateValue(fetchOptions, {
            location: `${sourceId}.loader.fetchOptions`,
            slot: "request",
          })
      resolvedLoader = async (loaderParams, context) => {
        const scope = createSourceTemplateScope(vars, { params: loaderParams })
        const resolvedUrl = resolveSourceUrl(urlTemplate.render(scope), baseUrl)
        assertNetworkCapability(sourceId, resolvedUrl, capabilities.network)
        const loaderOptions: HtmlLoaderOptions = request
          ? { ...options, url: resolvedUrl, request }
          : {
              ...options,
              url: resolvedUrl,
              fetchOptions: fetchOptionsTemplate?.render(scope),
            }
        return loadHtml(loaderOptions, {
          fetch: context.fetch,
          vars,
          params: loaderParams,
          signal: context.signal,
        })
      }
      break
    }
    case "rss": {
      const { url } = loader
      const urlTemplate = compileSourceTemplateValue(url, {
        location: `${sourceId}.loader.url`,
        slot: "request",
      })
      resolvedLoader = async (loaderParams, context) => {
        const resolvedUrl = resolveSourceUrl(
          urlTemplate.render(createSourceTemplateScope(vars, { params: loaderParams })),
          baseUrl,
        )
        assertNetworkCapability(sourceId, resolvedUrl, capabilities.network)
        return loadRss({ url: resolvedUrl }, {
          fetch: context.fetch,
          signal: context.signal,
        })
      }
      break
    }
    case "custom": {
      resolvedLoader = loader.load
      break
    }
    default:
      throw new Error(`Unsupported source loader: ${(loader as { type?: unknown }).type}`)
  }

  return {
    version,
    metadata: resolvedMetadata,
    baseUrl,
    vars,
    params,
    radar,
    requestRules,
    secrets,
    capabilities,
    loader: withValidatedLoaderResult(resolvedLoader, baseUrl),
  }
}

export const DEFAULT_SOURCE_VERSION = 2

export function resolveSourceVersion(value: unknown, location: string): number {
  if (value === undefined) return DEFAULT_SOURCE_VERSION
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${location} must be a positive safe integer`)
  }
  return value
}

function withValidatedLoaderResult<TParams extends SourceParamSchemaMap>(
  loader: SourceLoaderDefinition<TParams>,
  baseUrl: string | undefined,
): SourceLoader<TParams> {
  return async (params, context) => {
    const result = validateSourceLoaderResult(await loader(params, context))
    return baseUrl === undefined
      ? result
      : resolveSourceLoaderResultUrls(result, baseUrl)
  }
}

export const assignSourceDefaults = createDefu((object, key, value) => {
  if (Array.isArray(value) && Array.isArray(object[key])) {
    object[key] = value
    return true
  }
})

export function mergeSourceVars(
  providerVars: SourceTemplateVars | undefined,
  sourceVars: SourceTemplateVars | undefined,
): SourceTemplateVars | undefined {
  return mergeSourceVarValues(providerVars, sourceVars) as
    | SourceTemplateVars
    | undefined
}

function mergeSourceVarValues(
  defaultValue: SourceTemplateVarValue | undefined,
  sourceValue: SourceTemplateVarValue | undefined,
): SourceTemplateVarValue | undefined {
  if (sourceValue === undefined) {
    return defaultValue
  }
  if (!isRecord(defaultValue) || !isRecord(sourceValue)) {
    return sourceValue
  }

  const keys = new Set([...Object.keys(defaultValue), ...Object.keys(sourceValue)])
  const merged: Record<string, SourceTemplateVarValue> = {}
  for (const key of keys) {
    const value = mergeSourceVarValues(
      defaultValue[key] as SourceTemplateVarValue | undefined,
      sourceValue[key] as SourceTemplateVarValue | undefined,
    )
    if (value !== undefined) {
      merged[key] = value
    }
  }
  return merged
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function resolveRuntimeSource(
  sourceId: string,
  config: SourceConfig,
  provider: SourceProvider,
): RuntimeSource {
  if (Object.hasOwn(config, "cache")) {
    throw new Error(`${sourceId}.cache is not supported`)
  }
  validateSourceTemplates(sourceId, config)

  const source = resolveSource(sourceId, config)

  const secrets = source.secrets
  const cookieHosts = (secrets ?? [])
    .filter(secret => secret.type === "cookie")
    .map(secret => new URL(secret.origin).hostname)

  return {
    ...source,
    provider,
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
  location: string,
  vars?: SourceTemplateVars,
): TValue {
  return compileSourceTemplateValue(option, {
    location,
    slot: "request",
  }).render(createSourceTemplateScope(vars, { params }))
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
  sourceId: string,
  loader: StructuredLoaderConfig | { type: "custom", load: SourceLoaderDefinition<TParams> },
  params: TParams | undefined,
  vars: SourceTemplateVars | undefined,
  baseUrl: string | undefined,
  overrides: SourceCapabilityOverrides | undefined,
): SourceCapabilities {
  const inferredNetworkHosts: string[] = []

  if (loader.type !== "custom") {
    const defaultParams = resolveDefaultParams(params)
    const requestUrl = resolveSourceUrl(
      resolveSourceTemplates(
        loader.url,
        defaultParams,
        `${sourceId}.loader.url`,
        vars,
      ),
      baseUrl,
    )

    inferredNetworkHosts.push(new URL(requestUrl).hostname)
  }

  return {
    network: [...new Set([...inferredNetworkHosts, ...(overrides?.network ?? [])])],
    cookies: [...new Set(overrides?.cookies ?? [])],
  }
}
