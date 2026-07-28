import type { Color } from "@newsnext/shared/types"
import type {
  SourceParamSchemaMap,
  SourceRadarMatch,
  SourceRadarMetadata,
  SourceRadarRule,
} from "@newsnext/source/types"
import type { SourceInstanceMetadata, SourceInstancePatch } from "@/lib/source-cards"
import { parseSourceParams, renderTemplate } from "@newsnext/source/core"
import { match } from "path-to-regexp"

export interface RadarContext {
  url: string
  title?: string
}

export interface RadarSuggestion {
  id: string
  ruleId: string
  sourceId: string
  patch: SourceInstancePatch
  confidence: number
}

export interface RadarSourceMetadata {
  id: string
  title?: string
  icon?: string
  desc?: string
  home?: string
  color?: Color
  params?: SourceParamSchemaMap
  radar?: SourceRadarRule[]
}

interface RadarMatchContext {
  input: RadarContext
  url: URL
  pathParams: Record<string, string>
  params: Record<string, unknown>
  source: RadarSourceMetadata
}

interface SourceRuleSpec {
  source: RadarSourceMetadata
  rules: SourceRadarRule[]
}

const DEFAULT_RADAR_RULE_ID = "default-home-origin"
const DEFAULT_ORIGIN_RADAR_CONFIDENCE = 0

type PathMatch = (pathname: string) => Record<string, string> | null

interface CompiledRadarRule {
  source: RadarSourceMetadata
  rule: SourceRadarRule
  hosts: string[]
  includes: string[]
  pathMatches: PathMatch[]
}

export interface RadarMatcher {
  getSuggestions: (context: RadarContext) => RadarSuggestion[]
}

const matcherCache = new WeakMap<RadarSourceMetadata[], RadarMatcher>()

function createRadarSuggestion({
  ruleId,
  sourceId,
  patch,
  confidence = 1,
}: Omit<RadarSuggestion, "id" | "confidence"> & { confidence?: number }): RadarSuggestion {
  return {
    id: `${ruleId}:${sourceId}:${stablePatchKey(patch)}`,
    ruleId,
    sourceId,
    patch,
    confidence,
  }
}

function stablePatchKey(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(item => stablePatchKey(item)).join(",")}]`
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nestedValue]) => `${key}:${stablePatchKey(nestedValue)}`)
      .join(",")}}`
  }

  return String(value)
}

function getHostname(url: URL): string {
  return url.hostname.replace(/^www\./, "").toLowerCase()
}

function normalizeHostname(host: string): string {
  return host.replace(/^www\./, "").toLowerCase()
}

function createTemplateRecord<T>(
  entries: Iterable<readonly [string, T]>,
): Record<string, T | ""> {
  const values = Object.fromEntries(
    [...entries].map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() : value,
    ]),
  ) as Record<string, T>

  return new Proxy(values, {
    get(target, property) {
      if (typeof property !== "string") {
        return Reflect.get(target, property)
      }
      return Object.hasOwn(target, property) ? target[property] : ""
    },
    getOwnPropertyDescriptor(target, property) {
      return Reflect.getOwnPropertyDescriptor(target, property)
        ?? (typeof property === "string"
          ? { configurable: true, enumerable: false, value: "", writable: false }
          : undefined)
    },
  })
}

function getQueryParams(searchParams: URLSearchParams): Record<string, string> {
  return createTemplateRecord(searchParams)
}

function getHashQueryParams(url: URL): Record<string, string> {
  const hashSearchIndex = url.hash.indexOf("?")
  if (hashSearchIndex === -1) {
    return createTemplateRecord([])
  }

  return getQueryParams(new URLSearchParams(url.hash.slice(hashSearchIndex + 1)))
}

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim().length > 0
}

function createTemplateVariables(
  context: RadarMatchContext,
): Record<string, unknown> {
  return {
    hashQuery: getHashQueryParams(context.url),
    path: createTemplateRecord(Object.entries(context.pathParams)),
    params: createTemplateRecord(Object.entries(context.params)),
    page: {
      title: context.input.title ?? "",
    },
    query: getQueryParams(context.url.searchParams),
  }
}

function getMatchIncludes(matchSpec: SourceRadarMatch): string[] {
  const includes = matchSpec.includes
  if (!includes) {
    return []
  }

  return Array.isArray(includes) ? includes : [includes]
}

function compilePathMatch(template: string): PathMatch | null {
  try {
    const matcher = match<Record<string, string | string[]>>(template)
    return (pathname) => {
      const result = matcher(pathname)
      if (!result) {
        return null
      }

      return Object.fromEntries(
        Object.entries(result.params)
          .map(([key, value]) => [key, Array.isArray(value) ? value.join("/") : value]),
      )
    }
  } catch {
    return null
  }
}

function compilePathMatches(paths: string[] | undefined): PathMatch[] {
  if (!paths?.length) {
    return [() => ({})]
  }

  return paths
    .map(compilePathMatch)
    .filter((pathMatch): pathMatch is PathMatch => pathMatch !== null)
}

function matchRulePath(rule: CompiledRadarRule, url: URL): Record<string, string> | null {
  if (!rule.pathMatches.length) {
    return null
  }

  for (const pathMatch of rule.pathMatches) {
    const params = pathMatch(url.pathname)
    if (params) {
      return params
    }
  }

  return null
}

function compileRadarRule(sourceRule: SourceRuleSpec, rule: SourceRadarRule): CompiledRadarRule | null {
  const pathMatches = compilePathMatches(rule.match.paths)
  if (!pathMatches.length) {
    return null
  }

  return {
    source: sourceRule.source,
    rule,
    hosts: rule.match.hosts.map(normalizeHostname),
    includes: getMatchIncludes(rule.match),
    pathMatches,
  }
}

function indexRulesByHost(rules: CompiledRadarRule[]): Map<string, CompiledRadarRule[]> {
  const rulesByHost = new Map<string, CompiledRadarRule[]>()

  for (const rule of rules) {
    for (const host of rule.hosts) {
      const hostRules = rulesByHost.get(host) ?? []
      hostRules.push(rule)
      rulesByHost.set(host, hostRules)
    }
  }

  return rulesByHost
}

function resolveParamsPatch(
  rule: SourceRadarRule,
  context: RadarMatchContext,
): Record<string, unknown> | null {
  const parameterValues: Record<string, unknown> = {}

  try {
    for (const [key, template] of Object.entries(rule.patch?.params ?? {})) {
      const value = renderTemplate(template, createTemplateVariables(context))
      if (isPresent(value)) {
        parameterValues[key] = value
      }
    }

    return parseSourceParams(context.source.params, parameterValues)
  } catch {
    return null
  }
}

function resolveMetaPatchValue(
  valueSpec: string | undefined,
  context: RadarMatchContext,
): unknown {
  if (valueSpec === undefined) {
    return undefined
  }

  return renderTemplate(valueSpec, createTemplateVariables(context))
}

function resolveMetaPatch(
  metadataPatch: SourceRadarMetadata | undefined,
  context: RadarMatchContext,
): SourceInstanceMetadata {
  const metadata: SourceInstanceMetadata = {
    home: context.url.toString(),
  }
  const title = resolveMetaPatchValue(metadataPatch?.title, context)
  const icon = resolveMetaPatchValue(metadataPatch?.icon, context)
  const desc = resolveMetaPatchValue(metadataPatch?.desc, context)
  const home = resolveMetaPatchValue(metadataPatch?.home, context)
  const color = resolveMetaPatchValue(metadataPatch?.color, context)

  if (isPresent(title)) {
    metadata.title = String(title)
  }
  if (isPresent(icon)) {
    metadata.icon = String(icon)
  }
  if (isPresent(desc)) {
    metadata.desc = String(desc)
  }
  if (isPresent(home)) {
    metadata.home = String(home)
  }
  if (isPresent(color)) {
    metadata.color = color as Color
  }

  return metadata
}

function matchCompiledRule(compiledRule: CompiledRadarRule, input: RadarContext, url: URL): RadarSuggestion | null {
  const hostname = getHostname(url)
  if (!compiledRule.hosts.includes(hostname)) {
    return null
  }

  if (compiledRule.includes.length && !compiledRule.includes.some(value => url.toString().includes(value))) {
    return null
  }

  const pathParams = matchRulePath(compiledRule, url)
  if (!pathParams) {
    return null
  }

  const baseContext = {
    input,
    url,
    pathParams,
    source: compiledRule.source,
  }
  const paramsContext: RadarMatchContext = {
    ...baseContext,
    params: {},
  }
  const params = resolveParamsPatch(compiledRule.rule, paramsContext)
  if (!params) {
    return null
  }

  const context: RadarMatchContext = {
    ...paramsContext,
    params,
  }

  return createRadarSuggestion({
    ruleId: compiledRule.rule.id,
    sourceId: compiledRule.source.id,
    patch: {
      params,
      metadata: resolveMetaPatch(compiledRule.rule.patch?.metadata, context),
    },
    confidence: compiledRule.rule.confidence,
  })
}

function createSuggestions(context: RadarContext, rulesByHost: Map<string, CompiledRadarRule[]>): RadarSuggestion[] {
  let url: URL
  try {
    url = new URL(context.url)
  } catch {
    return []
  }

  const rules = rulesByHost.get(getHostname(url)) ?? []
  const suggestions = rules
    .map(rule => matchCompiledRule(rule, context, url))
    .filter((suggestion): suggestion is RadarSuggestion => suggestion !== null)
  const suggestionsById = new Map<string, RadarSuggestion>()

  for (const suggestion of suggestions) {
    suggestionsById.set(suggestion.id, suggestion)
  }

  return [...suggestionsById.values()].sort((a, b) => b.confidence - a.confidence)
}

function getSourceRuleSpecs(sourceMetadata: RadarSourceMetadata[] | undefined): SourceRuleSpec[] {
  return sourceMetadata
    ?.flatMap((source) => {
      if (source.radar !== undefined) {
        return source.radar.length ? [{ source, rules: source.radar }] : []
      }

      if (!source.home || Object.keys(source.params ?? {}).length > 0) {
        return []
      }

      try {
        const home = new URL(source.home)
        if (!["http:", "https:"].includes(home.protocol) || !home.hostname) {
          return []
        }

        return [{
          source,
          rules: [{
            confidence: DEFAULT_ORIGIN_RADAR_CONFIDENCE,
            id: DEFAULT_RADAR_RULE_ID,
            match: { hosts: [home.hostname] },
          }],
        }]
      } catch {
        return []
      }
    })
    ?? []
}

export function createRadarMatcher(sourceMetadata: RadarSourceMetadata[] = []): RadarMatcher {
  const cachedMatcher = matcherCache.get(sourceMetadata)
  if (cachedMatcher) {
    return cachedMatcher
  }

  const compiledRules = getSourceRuleSpecs(sourceMetadata)
    .flatMap(sourceRule => sourceRule.rules
      .map(rule => compileRadarRule(sourceRule, rule))
      .filter((rule): rule is CompiledRadarRule => rule !== null))
  const rulesByHost = indexRulesByHost(compiledRules)
  const radarMatcher: RadarMatcher = {
    getSuggestions: context => createSuggestions(context, rulesByHost),
  }

  matcherCache.set(sourceMetadata, radarMatcher)
  return radarMatcher
}

export function getRadarSuggestions(context: RadarContext, sourceMetadata?: RadarSourceMetadata[]): RadarSuggestion[] {
  return createRadarMatcher(sourceMetadata).getSuggestions(context)
}
