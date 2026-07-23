import type {
  Color,
  SourceParamSchemaMap,
  SourceRadarMatch,
  SourceRadarMetaPatch,
  SourceRadarPatchValue,
  SourceRadarRule,
  SourceRadarTransform,
  SourceRadarValue,
} from "@newsnext/source/typings"
import { parseSourceParams } from "@newsnext/source/utils/params"
import { match } from "path-to-regexp"

export interface RadarContext {
  url: string
  title?: string
}

export interface RadarSuggestionMetaPatch {
  providerTitle?: string
  title?: string
  desc?: string
  home?: string
  color?: Color
}

export interface RadarSuggestion {
  id: string
  ruleId: string
  sourceId: string
  paramsPatch: Record<string, unknown>
  metaPatch?: RadarSuggestionMetaPatch
  confidence: number
}

export interface RadarSourceMetadata {
  id: string
  providerTitle?: string
  title?: string
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
  rawParams: Record<string, unknown>
  paramsPatch: Record<string, unknown>
  source: RadarSourceMetadata
}

interface SourceRuleSpec {
  source: RadarSourceMetadata
  rules: SourceRadarRule[]
}

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
const regexCache = new Map<string, RegExp | null>()

function createRadarSuggestion({
  ruleId,
  sourceId,
  paramsPatch,
  metaPatch,
  confidence = 1,
}: Omit<RadarSuggestion, "id">): RadarSuggestion {
  return {
    id: `${ruleId}:${sourceId}:${stablePatchKey({ paramsPatch, metaPatch })}`,
    ruleId,
    sourceId,
    paramsPatch,
    metaPatch,
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

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function getPathParts(url: URL): string[] {
  return url.pathname.split("/").map(part => decodeURIComponent(part)).filter(Boolean)
}

function getHashQueryValue(url: URL, key: string): string | undefined {
  const hashSearchIndex = url.hash.indexOf("?")
  if (hashSearchIndex === -1) {
    return undefined
  }

  const hashParams = new URLSearchParams(url.hash.slice(hashSearchIndex + 1))
  return hashParams.get(key)?.trim() || undefined
}

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim().length > 0
}

function resolveValue(source: SourceRadarValue, context: RadarMatchContext): unknown {
  switch (source.type) {
    case "literal":
      return source.value
    case "path":
      return context.pathParams[source.name] ?? ""
    case "query":
      return context.url.searchParams.get(source.name)?.trim() ?? ""
    case "hashQuery":
      return getHashQueryValue(context.url, source.name) ?? ""
    case "pathSegmentWithPrefix":
      return getPathParts(context.url).find(part => part.startsWith(source.prefix)) ?? ""
    case "first":
      for (const valueSource of source.values) {
        const value = resolveValue(valueSource, context)
        if (isPresent(value)) {
          return value
        }
      }
      return ""
    case "pageTitle":
      return context.input.title ?? ""
  }
}

function applyTransform(value: string, transform: SourceRadarTransform, context: RadarMatchContext): string {
  switch (transform.type) {
    case "normalizeWhitespace":
      return normalizeWhitespace(value)
    case "replace":
      return replacePattern(value, transform.pattern, transform.replacement)
    case "extract":
      return extractPattern(value, transform)
    case "prepend":
      return `${transform.value}${value}`
    case "template":
      return renderTemplate(transform.value, createTemplateVariables(context, { value }))
  }
}

function getCachedRegex(pattern: string): RegExp | null {
  if (regexCache.has(pattern)) {
    return regexCache.get(pattern) ?? null
  }

  try {
    const regex = new RegExp(pattern)
    regexCache.set(pattern, regex)
    return regex
  } catch {
    regexCache.set(pattern, null)
    return null
  }
}

function replacePattern(value: string, pattern: string, replacement: string): string {
  const regex = getCachedRegex(pattern)
  return regex ? value.replace(regex, replacement).trim() : value.trim()
}

function extractPattern(value: string, transform: Extract<SourceRadarTransform, { type: "extract" }>): string {
  const matchResult = getCachedRegex(transform.pattern)?.exec(value)
  if (matchResult === undefined) {
    return transform.fallbackToEmpty ? "" : value
  }

  if (!matchResult) {
    return transform.fallbackToEmpty ? "" : value
  }

  return (matchResult[transform.group ?? 1] ?? matchResult[0] ?? "").trim()
}

function isPatchValue(value: SourceRadarValue | SourceRadarPatchValue): value is SourceRadarPatchValue {
  return !("type" in value)
}

function resolvePatchValue(spec: SourceRadarValue | SourceRadarPatchValue, context: RadarMatchContext): unknown {
  if (!isPatchValue(spec)) {
    return resolveValue(spec, context)
  }

  let value = String(resolveValue(spec.value, context) ?? "")
  for (const transform of spec.transforms ?? []) {
    value = applyTransform(value, transform, context)
  }

  if (isPresent(value)) {
    return value
  }

  if (typeof spec.fallback === "string") {
    return renderTemplate(spec.fallback, createTemplateVariables(context))
  }

  return spec.fallback
}

function createTemplateVariables(
  context: RadarMatchContext,
  extraVariables: Record<string, unknown> = {},
): Record<string, string> {
  return Object.fromEntries(
    Object.entries({
      ...context.pathParams,
      ...context.rawParams,
      ...context.paramsPatch,
      pageTitle: context.input.title ?? "",
      providerTitle: context.source.providerTitle ?? "",
      sourceTitle: context.source.title ?? "",
      ...extraVariables,
    }).map(([key, value]) => [key, String(value ?? "")]),
  )
}

function renderTemplate(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => String(variables[key] ?? "")).trim()
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

function inferNamedRawParam(paramName: string, context: Omit<RadarMatchContext, "rawParams" | "paramsPatch">): unknown {
  const pathValue = context.pathParams[paramName]
  if (isPresent(pathValue)) {
    return pathValue
  }

  const queryValue = context.url.searchParams.get(paramName)?.trim()
  if (isPresent(queryValue)) {
    return queryValue
  }

  return getHashQueryValue(context.url, paramName)
}

function inferRawParams(
  source: RadarSourceMetadata,
  context: Omit<RadarMatchContext, "rawParams" | "paramsPatch">,
): Record<string, unknown> {
  const rawParams: Record<string, unknown> = {}

  for (const paramName of Object.keys(source.params ?? {})) {
    const value = inferNamedRawParam(paramName, context)
    if (isPresent(value)) {
      rawParams[paramName] = value
    }
  }

  return rawParams
}

function resolveParamsPatch(
  rule: SourceRadarRule,
  context: RadarMatchContext,
): Record<string, unknown> | null {
  const rawParams = { ...context.rawParams }

  for (const [key, valueSpec] of Object.entries(rule.paramsPatch ?? {})) {
    const value = resolvePatchValue(valueSpec, context)
    if (!isPresent(value)) {
      return null
    }
    rawParams[key] = value
  }

  try {
    return parseSourceParams(context.source.params, rawParams)
  } catch {
    return null
  }
}

function resolveMetaPatchValue(
  valueSpec: string | SourceRadarPatchValue | undefined,
  context: RadarMatchContext,
): unknown {
  if (valueSpec === undefined) {
    return undefined
  }

  if (typeof valueSpec === "string") {
    return renderTemplate(valueSpec, createTemplateVariables(context))
  }

  return resolvePatchValue(valueSpec, context)
}

function resolveMetaPatch(
  metaPatch: SourceRadarMetaPatch | undefined,
  context: RadarMatchContext,
): RadarSuggestionMetaPatch {
  const resolvedMetaPatch: RadarSuggestionMetaPatch = {
    home: context.url.toString(),
  }
  const providerTitle = resolveMetaPatchValue(metaPatch?.providerTitle, context)
  const title = resolveMetaPatchValue(metaPatch?.title, context)
  const desc = resolveMetaPatchValue(metaPatch?.desc, context)
  const home = resolveMetaPatchValue(metaPatch?.home, context)
  const color = resolveMetaPatchValue(metaPatch?.color, context)

  if (isPresent(providerTitle)) {
    resolvedMetaPatch.providerTitle = String(providerTitle)
  }
  if (isPresent(title)) {
    resolvedMetaPatch.title = String(title)
  }
  if (isPresent(desc)) {
    resolvedMetaPatch.desc = String(desc)
  }
  if (isPresent(home)) {
    resolvedMetaPatch.home = String(home)
  }
  if (isPresent(color)) {
    resolvedMetaPatch.color = color as Color
  }

  return resolvedMetaPatch
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
  const rawParams = inferRawParams(compiledRule.source, baseContext)
  const contextWithRawParams: RadarMatchContext = {
    ...baseContext,
    rawParams,
    paramsPatch: {},
  }
  const paramsPatch = resolveParamsPatch(compiledRule.rule, contextWithRawParams)
  if (!paramsPatch) {
    return null
  }

  const context: RadarMatchContext = {
    ...contextWithRawParams,
    paramsPatch,
  }

  return createRadarSuggestion({
    ruleId: compiledRule.rule.id,
    sourceId: compiledRule.source.id,
    paramsPatch,
    metaPatch: resolveMetaPatch(compiledRule.rule.metaPatch, context),
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
    ?.flatMap(source => source.radar?.length ? [{ source, rules: source.radar }] : [])
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
