import type { Browser } from "@wxt-dev/browser"
import type { CardMetadata } from "./card.js"
import type { Color } from "./color.js"
import type { HtmlField } from "./html-field.js"
import type { NewsItem, NewsItemInput } from "./items.js"
import type { SourceParamSchemaMap } from "./params.js"

/**
 * Provider category: the provider's primary product experience, not an
 * individual source, topic, country, or loader type.
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
 * Secret (cookie/localStorage): origin + itemKey locate it; custom loaders
 * read it via ctx.secrets. Prefer declarative loaders over custom.
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

/**
 * Radar rule: matches a page (hosts + optional paths/query/location) and
 * patches params/metadata. Higher `priority` wins. One page with several
 * independent sources needs one rule per source, otherwise discovery is
 * forced to pick a single stream.
 */
export interface SourceRadarRule {
  id: string
  match: SourceRadarMatch
  patch?: SourceRadarPatch
  priority?: number
}

/**
 * Card-aware metadata: static values must stay correct for every param
 * combination (no concrete user/channel/playlist identity; no `|` in title
 * because ` | ` separates identity/variant in LiveCard titles).
 * Concrete identity resolves via Radar or loader metadata. `type` selects
 * list vs ranking presentation.
 */
export interface SourcePresentationMetadata extends Omit<CardMetadata, "color"> {
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

/**
 * Loader output: items (max 50, order preserved) + optional metadata.
 * Items need title + url; entries without both are dropped. Unparseable
 * dates leave the time unset so one bad entry never fails the whole load.
 */
export interface SourceLoaderOutput {
  items: NewsItemInput[]
  metadata?: SourcePresentationMetadata
}

export const SOURCE_PRESENTATION_METADATA_KEYS = [
  "title",
  "badge",
  "desc",
  "home",
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

/**
 * Provider identity: title/icon/color/category describe the provider and are
 * inherited by every source. `color` never belongs in source, card, or Radar
 * metadata — a card's palette always comes from its provider.
 */
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
