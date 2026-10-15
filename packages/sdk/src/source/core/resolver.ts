import type { InferSourceParams, SourceCapabilities, SourceLoaderOutput, SourceParamSchemaMap, SourcePresentationMetadata, SourceProvider, SourceRadarRule, SourceRequestRule, SourceSecretDefinition, SourceTemplateVars, SourceTemplateVarValue } from "../../models/index.js"
import type { RuntimeSource, SourceAnnotationFormatter, SourceLoader, SourceLoaderDefinition } from "../types"
import type { HtmlLoaderOptions } from "./loaders/html"
import type { JsonLoaderOptions } from "./loaders/json"
import type { LoaderContext, LoaderRequestOptions } from "./loaders/shared"
import type { CompiledSourceRequest } from "./request-templates"
import type { CompiledSourceTemplate } from "./template"

import { createDefu } from "defu"
import {
  parseSourceBaseUrl,
  resolveSourceLoaderResultUrls,
  resolveSourceMetadataUrls,
} from "./base-url"
import { assertNetworkCapability, validateSourceRequestRules } from "./capabilities"
import {
  renderSourceLoaderResult,
  validateSourceLoaderOutput,
} from "./loader-result"
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
import { compileSourceRequest } from "./request-templates"
import {
  compileSourceTemplate,
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

interface AnnotationConfig {
  /** Optional presentation: missing template inputs render as empty text. Use ?? for explicit fallback text. */
  annotation?: string | SourceAnnotationFormatter
}

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
  ) & {
    /** Query values are encoded once; missing, null, and empty values are omitted. */
    query?: Record<string, string | number | boolean | null>
  } & AnnotationConfig

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
      } & AnnotationConfig
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

interface CompiledSourceTemplates {
  annotation: CompiledSourceTemplate | SourceAnnotationFormatter | undefined
  request: CompiledSourceRequest | undefined
}

function compileSourceTemplates(
  sourceId: string,
  config: SourceConfig,
): CompiledSourceTemplates {
  validateSourceMetadataTemplates(config.metadata, `${sourceId}.metadata`)
  const annotation = compileSourceAnnotation(sourceId, config.loader.annotation)

  const { loader } = config
  const request = loader.type === "custom"
    ? undefined
    : compileSourceRequest(loader, `${sourceId}.loader`)

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
  return { annotation, request }
}

function compileSourceAnnotation(
  sourceId: string,
  value: unknown,
): CompiledSourceTemplate | SourceAnnotationFormatter | undefined {
  if (value === undefined) return undefined
  if (typeof value === "function") return value as SourceAnnotationFormatter
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${sourceId}.loader.annotation must be a non-empty string or a function`)
  }
  return compileSourceTemplate(value, {
    location: `${sourceId}.loader.annotation`,
    slot: "annotation",
  })
}

function validateSourceMetadataTemplates(
  metadata: SourceConfig["metadata"],
  location: string,
): void {
  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (typeof value === "string" && isTemplate(value)) {
      throw new TypeError(
        `Source templates are not allowed at ${location}.${key}; use a Radar metadata patch for dynamic values`,
      )
    }
  }
}

function validateJsonFieldExpressions(value: unknown, location: string): void {
  if (typeof value === "string") {
    validateJsonExpressionAt(value, location)
    return
  }
  if (typeof value === "function" || !value || typeof value !== "object") {
    return
  }

  if ("select" in value || "template" in value || "transform" in value) {
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
  templates: CompiledSourceTemplates,
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
    templates.request,
    params,
    vars,
    baseUrl,
    capabilityOverrides,
  )
  validateSourceRequestRules(sourceId, requestRules, capabilities.network)
  const version = resolveSourceVersion(versionInput, `${sourceId}.version`)
  let resolvedLoader: SourceLoaderDefinition<TParams>
  if (loader.type === "custom") {
    resolvedLoader = loader.load
  } else {
    const requestTemplates = templates.request
    if (!requestTemplates) throw new Error(`Missing compiled request for ${sourceId}`)
    const customRequest = "request" in loader ? loader.request : undefined
    const withRequest = (
      load: (options: { url: string } & LoaderRequestOptions, context: LoaderContext) => Promise<SourceLoaderOutput>,
    ): SourceLoaderDefinition<TParams> => async (loaderParams, context) => {
      const scope = createSourceTemplateScope(vars, { params: loaderParams })
      const url = requestTemplates.renderRequestUrl(scope, baseUrl)
      assertNetworkCapability(sourceId, url, capabilities.network)
      const requestOptions = customRequest
        ? { url, request: customRequest }
        : { url, fetchOptions: requestTemplates.renderFetchOptions(scope) }
      return load(requestOptions, {
        fetch: context.fetch,
        vars,
        params: loaderParams,
        signal: context.signal,
      })
    }
    switch (loader.type) {
      case "json": {
        const { type: _type, url: _url, query: _query, fetchOptions: _fetchOptions, request: _request, annotation: _annotation, ...options } = loader
        resolvedLoader = withRequest((requestOptions, context) => loadJson({ ...options, ...requestOptions }, context))
        break
      }
      case "html": {
        const { type: _type, url: _url, query: _query, fetchOptions: _fetchOptions, request: _request, annotation: _annotation, ...options } = loader
        resolvedLoader = withRequest((requestOptions, context) => loadHtml({ ...options, ...requestOptions }, context))
        break
      }
      case "rss": {
        resolvedLoader = withRequest(({ url }, context) => loadRss({ url }, context))
        break
      }
      default:
        throw new Error(`Unsupported source loader: ${(loader as { type?: unknown }).type}`)
    }
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
    loader: withValidatedLoaderResult(resolvedLoader, baseUrl, templates.annotation),
  }
}

export const DEFAULT_SOURCE_VERSION = 2
// WHY: version partitions snapshots/datasets; bump only on behavioral or result-shape change, never for copy edits.

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
  annotation: CompiledSourceTemplate | SourceAnnotationFormatter | undefined,
): SourceLoader<TParams> {
  return async (params, context) => {
    const result = validateSourceLoaderOutput(await loader(params, context), baseUrl)
    const resolvedResult = baseUrl === undefined
      ? result
      : resolveSourceLoaderResultUrls(result, baseUrl)
    return renderSourceLoaderResult(resolvedResult, annotation, context)
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
  const templates = compileSourceTemplates(sourceId, config)
  const source = resolveSource(sourceId, config, templates)

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
  request: CompiledSourceRequest | undefined,
  params: TParams | undefined,
  vars: SourceTemplateVars | undefined,
  baseUrl: string | undefined,
  overrides: SourceCapabilityOverrides | undefined,
): SourceCapabilities {
  const inferredNetworkHosts: string[] = []

  if (request) {
    const defaultParams = resolveDefaultParams(params)
    const requestUrl = request.renderUrl(createSourceTemplateScope(vars, { params: defaultParams }), baseUrl)

    inferredNetworkHosts.push(new URL(requestUrl).hostname)
  }

  return {
    network: [...new Set([...inferredNetworkHosts, ...(overrides?.network ?? [])])],
    cookies: [...new Set(overrides?.cookies ?? [])],
  }
}
