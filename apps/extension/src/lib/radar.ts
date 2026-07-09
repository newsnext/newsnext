import type {
  SourceRadarCondition,
  SourceRadarMatch,
  SourceRadarParam,
  SourceRadarRule,
  SourceRadarTitle,
  SourceRadarTransform,
  SourceRadarValue,
} from "@newsnext/client-source/typings"
import { match } from "path-to-regexp"

export interface RadarContext {
  url: string
  title?: string
}

export interface RadarSuggestion {
  id: string
  ruleId: string
  sourceId: string
  title: string
  params: Record<string, unknown>
  confidence: number
}

export interface RadarSourceMetadata {
  id: string
  title?: string
  radar?: SourceRadarRule[]
}

interface RadarMatchContext {
  input: RadarContext
  url: URL
  pathParams: Record<string, string>
  values?: Record<string, unknown>
  sourceTitle?: string
}

interface SourceRuleSpec {
  sourceId: string
  sourceTitle?: string
  rules: SourceRadarRule[]
}

type PathMatch = (pathname: string) => Record<string, string> | null

interface CompiledRadarRule {
  sourceId: string
  sourceTitle?: string
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
  title,
  params,
  confidence = 1,
}: Omit<RadarSuggestion, "id">): RadarSuggestion {
  return {
    id: `${ruleId}:${sourceId}:${stableParamsKey(params)}`,
    ruleId,
    sourceId,
    title,
    params,
    confidence,
  }
}

function stableParamsKey(params: Record<string, unknown>): string {
  return Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${stableValueKey(value)}`)
    .join("&")
}

function stableValueKey(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(item => stableValueKey(item)).join(",")}]`
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nestedValue]) => `${key}:${stableValueKey(nestedValue)}`)
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

function isPresent(value: unknown): value is string | number | boolean {
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
      return renderTemplate(transform.value, { ...createTemplateVariables(context), value })
  }
}

function resolveTitle(spec: SourceRadarTitle, context: RadarMatchContext): string {
  if (spec.type === "template") {
    return renderTemplate(spec.value, createTemplateVariables(context))
  }

  let value = String(resolveValue(spec.value, context) ?? "")
  for (const transform of spec.transforms ?? []) {
    value = applyTransform(value, transform, context)
  }

  if (value.trim()) {
    return value.trim()
  }

  return spec.fallback ? renderTemplate(spec.fallback, createTemplateVariables(context)) : "Radar"
}

function resolveParamTitle(spec: Extract<SourceRadarTitle, { type: "param" }>, context: RadarMatchContext): string {
  let value = String(context.values?.[spec.name] ?? "")
  for (const transform of spec.transforms ?? []) {
    value = applyTransform(value, transform, context)
  }

  if (value.trim()) {
    return value.trim()
  }

  return spec.fallback ? renderTemplate(spec.fallback, createTemplateVariables(context)) : context.sourceTitle ?? "Radar"
}

function resolveSuggestionTitle(spec: SourceRadarTitle | undefined, context: RadarMatchContext): string {
  if (!spec) {
    return context.sourceTitle ?? "Radar"
  }

  if (spec.type === "param") {
    return resolveParamTitle(spec, context)
  }

  return resolveTitle(spec, context)
}

function createTemplateVariables(context: RadarMatchContext): Record<string, string> {
  return {
    ...context.pathParams,
    ...Object.fromEntries(Object.entries(context.values ?? {}).map(([key, value]) => [key, String(value ?? "")])),
    title: context.input.title ?? "",
    sourceTitle: context.sourceTitle ?? "",
  }
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

function isListedValue(list: string[] | undefined, value: string): boolean {
  if (!list) {
    return false
  }

  return list.some(item => item.toLowerCase() === value.toLowerCase())
}

function isAllowedValue(list: string[] | undefined, value: string): boolean {
  if (!list) {
    return true
  }

  return list.includes(value)
}

function testPattern(pattern: string | undefined, value: string): boolean {
  if (!pattern) {
    return true
  }

  return getCachedRegex(pattern)?.test(value) ?? false
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

function compileRadarRule(sourceRule: SourceRuleSpec, rule: SourceRadarRule): CompiledRadarRule | null {
  const pathMatches = compilePathMatches(rule.match.paths)
  if (!pathMatches.length) {
    return null
  }

  return {
    sourceId: sourceRule.sourceId,
    sourceTitle: sourceRule.sourceTitle,
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

  const context: RadarMatchContext = {
    input,
    url,
    pathParams,
    sourceTitle: compiledRule.sourceTitle,
  }
  if (compiledRule.rule.conditions?.some(condition => !isConditionMatched(condition, context))) {
    return null
  }

  const params = resolveParams(compiledRule.rule, context)
  if (!params) {
    return null
  }

  const contextWithValues: RadarMatchContext = { ...context, values: params }

  return createRadarSuggestion({
    ruleId: compiledRule.rule.id,
    sourceId: compiledRule.sourceId,
    title: resolveSuggestionTitle(compiledRule.rule.title, contextWithValues),
    params,
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
    ?.flatMap(source => source.radar?.length ? [{ sourceId: source.id, sourceTitle: source.title, rules: source.radar }] : [])
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

function isConditionMatched(condition: SourceRadarCondition, context: RadarMatchContext): boolean {
  switch (condition.type) {
    case "urlIncludes":
      return context.url.toString().includes(condition.value)
    case "oneOf":
      return condition.conditions.some(item => isConditionMatched(item, context))
    case "value": {
      const value = String(resolveValue(condition.value, context) ?? "")
      if (condition.exists && !isPresent(value)) {
        return false
      }
      if (!testPattern(condition.pattern, value)) {
        return false
      }
      if (condition.startsWith && !value.startsWith(condition.startsWith)) {
        return false
      }
      if (!isAllowedValue(condition.in, value)) {
        return false
      }
      if (isListedValue(condition.notIn, value)) {
        return false
      }
      return true
    }
  }
}

function isRadarParam(param: SourceRadarValue | SourceRadarParam): param is SourceRadarParam {
  return !("type" in param)
}

function getRadarParamValueSource(param: SourceRadarValue | SourceRadarParam): SourceRadarValue {
  return isRadarParam(param) ? param.value : param
}

function isParamMatched(param: SourceRadarValue | SourceRadarParam, value: unknown): boolean {
  if (!isRadarParam(param)) {
    return true
  }

  const stringValue = String(value ?? "")
  if (param.required && !isPresent(value)) {
    return false
  }
  if (!testPattern(param.pattern, stringValue)) {
    return false
  }
  if (param.startsWith && !stringValue.startsWith(param.startsWith)) {
    return false
  }
  if (!isAllowedValue(param.in, stringValue)) {
    return false
  }
  if (isListedValue(param.notIn, stringValue)) {
    return false
  }

  return true
}

function resolveParams(rule: SourceRadarRule, context: RadarMatchContext): Record<string, unknown> | null {
  const params = Object.fromEntries(
    Object.entries(rule.params).map(([key, param]) => [key, resolveValue(getRadarParamValueSource(param), context)]),
  )

  for (const [key, param] of Object.entries(rule.params)) {
    if (!isParamMatched(param, params[key])) {
      return null
    }
  }

  return params
}
