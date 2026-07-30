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
  SourceTemplateVars,
  SourceTemplateVarValue,
} from "../types"
import type { HtmlSourceOptions } from "./loaders/html"
import type { JsonSourceOptions } from "./loaders/json"

import { createDefu } from "defu"
import { isSourcePresentationMetadataKey } from "../types"
import { assertNetworkCapability, validateSourceRequestRules } from "./capabilities"
import { compileHtmlFieldTemplates, loadHtml } from "./loaders/html"
import {
  compileJsonFieldTemplates,
  compileJsonMetadataTemplates,
  loadJson,
  validateJsonExpression,
} from "./loaders/json"
import { loadRss } from "./loaders/rss"
import {
  compileSourceParamTemplates,
  parseSourceParamValue,
} from "./params"
import { validateRadarRules } from "./radar"
import {
  compileSourceTemplateValue,
  createSourceTemplateScope,
  isTemplate,
} from "./template"

interface SourceConfigBase<TParams extends SourceParamSchemaMap> {
  metadata?: Omit<SourceMetadata, "key">
  vars?: SourceTemplateVars
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
  validateSourceVars(config.vars, `${sourceId}.vars`)
  compileSourceParamTemplates(config.params, `${sourceId}.params`)
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
    if (typeof loader.items === "string") {
      validateJsonExpressionAt(loader.items, `${sourceId}.loader.items`)
    }
    validateJsonFieldExpressions(loader.fields, `${sourceId}.loader.fields`)
    validateJsonFieldExpressions(loader.metadata, `${sourceId}.loader.metadata`)
    compileJsonFieldTemplates(loader.fields, `${sourceId}.loader.fields`)
    compileJsonMetadataTemplates(loader.metadata, `${sourceId}.loader.metadata`)
  } else if (loader.type === "html") {
    compileHtmlFieldTemplates(loader.fields, `${sourceId}.loader.fields`)
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
  key: string,
  config: SourceConfig<TParams>,
): ResolvedSource<TParams> {
  const {
    vars,
    params,
    radar,
    requestRules,
    secrets,
    cache: cacheInput,
    loader,
    capabilities: capabilityOverrides,
    metadata = {},
  } = config
  const capabilities = resolveSourceCapabilities(
    key,
    loader,
    params,
    vars,
    capabilityOverrides,
  )
  validateSourceRequestRules(key, requestRules, capabilities.network)
  const cache = typeof cacheInput === "string"
    ? { version: 1, maxAge: cacheInput }
    : cacheInput
  const registration = {
    key,
    ...metadata,
    vars,
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
      const urlTemplate = compileSourceTemplateValue(url, {
        location: `${key}.loader.url`,
        slot: "request",
      })
      const fetchOptionsTemplate = fetchOptions === undefined
        ? undefined
        : compileSourceTemplateValue(fetchOptions, {
            location: `${key}.loader.fetchOptions`,
            slot: "request",
          })
      return {
        ...registration,
        loader: async (loaderParams) => {
          const scope = createSourceTemplateScope(vars, { params: loaderParams })
          const resolvedUrl = urlTemplate.render(scope)
          assertNetworkCapability(key, resolvedUrl, capabilities.network)
          return loadJson({
            ...options,
            url: resolvedUrl,
            fetchOptions: fetchOptionsTemplate?.render(scope),
            type: metadata.type,
          }, {
            vars,
            params: loaderParams,
          })
        },
      }
    }
    case "html": {
      const { type: _type, url, fetchOptions, ...options } = loader
      const urlTemplate = compileSourceTemplateValue(url, {
        location: `${key}.loader.url`,
        slot: "request",
      })
      const fetchOptionsTemplate = fetchOptions === undefined
        ? undefined
        : compileSourceTemplateValue(fetchOptions, {
            location: `${key}.loader.fetchOptions`,
            slot: "request",
          })
      return {
        ...registration,
        loader: async (loaderParams) => {
          const scope = createSourceTemplateScope(vars, { params: loaderParams })
          const resolvedUrl = urlTemplate.render(scope)
          assertNetworkCapability(key, resolvedUrl, capabilities.network)
          return loadHtml({
            ...options,
            url: resolvedUrl,
            fetchOptions: fetchOptionsTemplate?.render(scope),
            type: metadata.type,
          }, {
            vars,
            params: loaderParams,
          })
        },
      }
    }
    case "rss": {
      const { url } = loader
      const urlTemplate = compileSourceTemplateValue(url, {
        location: `${key}.loader.url`,
        slot: "request",
      })
      return {
        ...registration,
        loader: async (loaderParams) => {
          const resolvedUrl = urlTemplate.render(
            createSourceTemplateScope(vars, { params: loaderParams }),
          )
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
  id: string,
  key: string,
  config: SourceConfig,
  provider: SourceProvider,
): RuntimeSource {
  validateSourceTemplates(id, config)

  const source = resolveSource(key, config)

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
  vars: SourceTemplateVars | undefined,
): InferSourceParams<TParams> {
  return Object.fromEntries(
    Object.entries(params ?? {}).map(([key, param]) => [
      key,
      parseSourceParamValue(param, undefined, vars ?? {}),
    ]),
  ) as InferSourceParams<TParams>
}

function resolveSourceCapabilities<TParams extends SourceParamSchemaMap>(
  sourceId: string,
  loader: StructuredSourceLoaderConfig | { type: "custom", load: SourceLoader<TParams> },
  params: TParams | undefined,
  vars: SourceTemplateVars | undefined,
  overrides: SourceCapabilityOverrides | undefined,
): SourceCapabilities {
  const inferredNetworkHosts: string[] = []

  if (loader.type !== "custom") {
    const defaultParams = resolveDefaultParams(params, vars)
    const requestUrl = resolveSourceTemplates(
      loader.url,
      defaultParams,
      `${sourceId}.loader.url`,
      vars,
    )

    inferredNetworkHosts.push(new URL(requestUrl).hostname)
  }

  return {
    network: [...new Set([...inferredNetworkHosts, ...(overrides?.network ?? [])])],
    cookies: [...new Set(overrides?.cookies ?? [])],
    browser: [...new Set(overrides?.browser ?? [])],
  }
}
