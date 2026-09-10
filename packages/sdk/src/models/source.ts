import type { Browser } from "@wxt-dev/browser"
import type { CardMetadata } from "./card.js"
import type { Color } from "./color.js"
import type { HtmlField } from "./html-field.js"
import type { NewsItem, NewsItemInput } from "./items.js"
import type { SourceParamSchemaMap } from "./params.js"

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

export interface SourceRadarPaths {
  include?: string[]
  exclude?: string[]
}

export interface SourceRadarMatch {
  hosts: string[]
  location?: "url" | "hash"
  paths?: string[] | SourceRadarPaths
  query?: string[]
}

export type SourceRadarParamScript = () => unknown | Promise<unknown>

export type SourceRadarParam = string | SourceRadarParamScript

export type SourceRadarParams = Record<string, SourceRadarParam>

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
  priority?: number
}

export interface SourcePresentationMetadata extends CardMetadata {
  type?: SourcePresentationType
}

export const SOURCE_PRESENTATION_TYPES = ["list", "ranking"] as const
export type SourcePresentationType = typeof SOURCE_PRESENTATION_TYPES[number]

const SOURCE_PRESENTATION_TYPE_SET: ReadonlySet<string> = new Set(SOURCE_PRESENTATION_TYPES)

export function isSourcePresentationType(value: unknown): value is SourcePresentationType {
  return typeof value === "string" && SOURCE_PRESENTATION_TYPE_SET.has(value)
}

export interface SourceLoaderResult {
  items: NewsItem[]
  inlinePresentation?: string[]
  metadata?: SourcePresentationMetadata
}

export interface SourceLoaderOutput {
  items: NewsItemInput[]
  metadata?: SourcePresentationMetadata
}

export const SOURCE_PRESENTATION_METADATA_KEYS = [
  "title",
  "badge",
  "desc",
  "home",
  "color",
  "type",
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

export interface SourceDescriptor<TParams extends SourceParamSchemaMap = SourceParamSchemaMap> {
  provider: SourceProvider
  version: number
  baseUrl?: string
  metadata: SourcePresentationMetadata
  vars?: SourceTemplateVars
  params?: TParams
  capabilities: SourceCapabilities
  secrets?: SourceSecretDefinition[]
  radar?: SourceRadarRule[]
  requestRules?: readonly SourceRequestRule[]
  id: string
}
