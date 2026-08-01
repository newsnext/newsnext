import type { Color, NewsItem } from "@newsnext/shared/types"
import type { Browser } from "@wxt-dev/browser"
import type { KyInstance } from "ky"
import type { HtmlField } from "./html-field"
import type { InferSourceParams, SourceParamSchemaMap } from "./params"

/**
 * Provider category identifiers
 */
export const CATEGORY_IDS = [
  "social",
  "forum",
  "news",
  "finance",
  "developer",
  "entertainment",
] as const

export type CategoryId = typeof CATEGORY_IDS[number]

/**
 * Loader function for a source
 */
export interface SourceSecretBaseDefinition {
  key: string
  origin: string
  itemKey: string
  cache?: boolean
  required?: boolean
}

export interface SourceCookieSecretDefinition extends SourceSecretBaseDefinition {
  type: "cookie"
}

export interface SourceLocalStorageSecretDefinition extends SourceSecretBaseDefinition {
  type: "localStorage"
}

export type SourceSecretDefinition = SourceCookieSecretDefinition | SourceLocalStorageSecretDefinition

export type SourceSecrets = Record<string, string | undefined>

export interface SourceRadarPathRegex {
  regex: string
}

export type SourceRadarPathPattern = string | SourceRadarPathRegex

export interface SourceRadarPaths {
  include?: SourceRadarPathPattern[]
  exclude?: SourceRadarPathPattern[]
}

export interface SourceRadarMatch {
  hosts: string[]
  paths?: string[] | SourceRadarPaths
}

export type SourceRadarParams = Record<string, string>

export type SourceRadarMetadata = {
  [K in keyof SourcePresentationMetadata]?: HtmlField
}

export interface SourcePatch<TParams = SourceRadarParams, TMetadata = SourceRadarMetadata> {
  params?: TParams
  metadata?: TMetadata
}

export type SourceRadarPatch = SourcePatch

export interface SourceRadarRule {
  id: string
  match: SourceRadarMatch
  patch?: SourceRadarPatch
  confidence?: number
}

export type SourceFetch = KyInstance

export interface SourceLoaderContext {
  fetch: SourceFetch
  secrets?: SourceSecrets
  signal: AbortSignal
  updateSecrets?: (secrets: SourceSecrets) => Promise<void>
}

export interface SourcePresentationMetadata {
  title?: string
  badge?: string
  desc?: string
  home?: string
}

export interface SourceLoaderResult {
  items: NewsItem[]
  metadata?: SourcePresentationMetadata
}

export type SourceLoader<TParams extends SourceParamSchemaMap = SourceParamSchemaMap> = (
  params: InferSourceParams<TParams>,
  context: SourceLoaderContext,
) => Promise<SourceLoaderResult>

export const SOURCE_PRESENTATION_METADATA_KEYS = [
  "title",
  "badge",
  "desc",
  "home",
] as const satisfies readonly (keyof SourcePresentationMetadata)[]

const SOURCE_PRESENTATION_METADATA_KEY_SET: ReadonlySet<string> = new Set(
  SOURCE_PRESENTATION_METADATA_KEYS,
)

export function isSourcePresentationMetadataKey(
  value: string,
): value is keyof SourcePresentationMetadata {
  return SOURCE_PRESENTATION_METADATA_KEY_SET.has(value)
}

export interface SourceCapabilities {
  network: readonly string[]
  cookies: readonly string[]
}

export interface SourceProvider {
  title: string
  category?: CategoryId
  icon?: string
  color: Color
}

export type SourceTemplateVarValue
  = | boolean
    | null
    | number
    | string
    | readonly SourceTemplateVarValue[]
    | { readonly [key: string]: SourceTemplateVarValue }

export type SourceTemplateVars = Readonly<Record<string, SourceTemplateVarValue>>

export type SourceRequestRule = Omit<Browser.declarativeNetRequest.Rule, "id">

export type SourceCacheMaxAge = `${number}${"s" | "m" | "h" | "d"}`

export interface SourceCacheConfig {
  version: number
  maxAge: SourceCacheMaxAge
}

export interface RuntimeSource<TParams extends SourceParamSchemaMap = SourceParamSchemaMap> {
  provider: SourceProvider
  baseUrl?: string
  metadata: SourcePresentationMetadata
  vars?: SourceTemplateVars
  params?: TParams
  capabilities: SourceCapabilities
  cache: SourceCacheConfig
  secrets?: SourceSecretDefinition[]
  radar?: SourceRadarRule[]
  requestRules?: readonly SourceRequestRule[]
  loader: SourceLoader<TParams>
}

/**
 * Provider definition after source defaults are expanded
 */
export interface ProviderDefinition {
  sources: Record<string, RuntimeSource<any>>
}

/**
 * Public descriptor for sources exposed to clients
 */
export type SourceDescriptor<TParams extends SourceParamSchemaMap = SourceParamSchemaMap>
  = Omit<RuntimeSource<TParams>, "loader"> & {
    id: string
  }
