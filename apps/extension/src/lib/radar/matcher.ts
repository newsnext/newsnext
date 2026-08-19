import type { CompiledSourceTemplate } from "@newsnext/source-kit/core"
import type {
  HtmlField,
  SourceDescriptor,
  SourcePresentationMetadata,
  SourceRadarMatch,
  SourceRadarMetadata,
  SourceRadarParamScript,
  SourceRadarRule,
} from "@newsnext/source-kit/types"
import type { RadarPageQuery } from "./page-query"
import type { SourceInstanceMetadata, SourceInstancePatch } from "@/lib/source"
import {
  compileSourceTemplate,
  createSourceTemplateScope,
  parseSourceParams,
  reportTemplateError,
  resolveSourceUrl,
  TemplateRenderError,
  validateSourceParamPatch,
} from "@newsnext/source-kit/core"
import { match } from "path-to-regexp"
import {
  createRadarPageQuery,
  getRadarPageQueryKey,
} from "./page-query"

export interface RadarContext {
  url: string
  title?: string
  pageSelections?: Record<string, string>
  pageScriptValues?: Record<string, unknown>
}

export interface RadarPageScript {
  key: string
  script: SourceRadarParamScript
}

export interface RadarSuggestion {
  id: string
  ruleId: string
  sourceId: string
  patch: SourceInstancePatch
}

export type RadarSourceMetadata = Pick<
  SourceDescriptor,
  "id" | "baseUrl" | "vars" | "params" | "radar"
> & {
  metadata?: SourcePresentationMetadata
}

interface RadarMatchContext {
  url: URL
  page: Record<string, string>
  pathParams: Record<string, string>
  queryParams: Record<string, string>
  params: Record<string, unknown>
  source: RadarSourceMetadata
}

interface SourceRuleSpec {
  source: RadarSourceMetadata
  rules: SourceRadarRule[]
}

interface RadarLocation {
  rules: CompiledRadarRule[]
  url: URL
}

const DEFAULT_RADAR_RULE_ID = "default-home-origin"
const HOST_MATCH_GRANULARITY = 0
const PATH_MATCH_GRANULARITY = 1
const QUERY_MATCH_GRANULARITY = 2
const HOST_PATH_KIND = 0
const WILDCARD_PATH_KIND = 1
const PARAMETERIZED_PATH_KIND = 2
const EXACT_PATH_KIND = 3

interface LocationMatch {
  pathParams: Record<string, string>
  queryParams: Record<string, string>
  specificity: MatchSpecificity
}

interface MatchSpecificity {
  dynamicSegments: number
  granularity: number
  pathDepth: number
  pathKind: number
  requiredQueryKeys: number
  staticSegments: number
  wildcardSegments: number
}

const HOST_SPECIFICITY: MatchSpecificity = {
  dynamicSegments: 0,
  granularity: HOST_MATCH_GRANULARITY,
  pathDepth: 0,
  pathKind: HOST_PATH_KIND,
  requiredQueryKeys: 0,
  staticSegments: 0,
  wildcardSegments: 0,
}

type LocationMatcher = (url: URL) => LocationMatch | null

interface PathMatch {
  params: Record<string, string>
  specificity: MatchSpecificity
}

type PathMatcher = (pathname: string) => PathMatch | null

interface LocationPatterns {
  include: string[]
  exclude: string[]
}

interface CompiledRadarRule {
  metadata: Partial<Record<keyof SourceRadarMetadata, CompiledRadarMetadata>>
  paramTemplates: Record<string, CompiledSourceTemplate>
  paramScripts: Record<string, RadarPageScript>
  source: RadarSourceMetadata
  rule: SourceRadarRule
  hosts: string[]
  locationMatcher: LocationMatcher
}

interface RankedRadarSuggestion {
  priority: number
  specificity: MatchSpecificity
  suggestion: RadarSuggestion
}

type CompiledRadarMetadata
  = {
    kind: "field"
    query: RadarPageQuery
    template?: CompiledSourceTemplate
  }
  | {
    kind: "template"
    template: CompiledSourceTemplate
  }

export interface RadarMatcher {
  getPageQueries: (context: RadarContext) => RadarPageQuery[]
  getPageScripts: (context: RadarContext) => RadarPageScript[]
  getSuggestions: (context: RadarContext) => RadarSuggestion[]
}

const matcherCache = new WeakMap<RadarSourceMetadata[], RadarMatcher>()

function createRadarSuggestion({
  ruleId,
  sourceId,
  patch,
}: Omit<RadarSuggestion, "id">): RadarSuggestion {
  return {
    id: `${ruleId}:${sourceId}:${stablePatchKey(patch)}`,
    ruleId,
    sourceId,
    patch,
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

interface ParsedRadarLocation {
  pathname: string
  searchParams: URLSearchParams
}

function getHashLocation(url: URL): ParsedRadarLocation | null {
  const value = url.hash.slice(1)
  if (!value) return null
  if (value.startsWith("?")) {
    return {
      pathname: "/",
      searchParams: new URLSearchParams(value.slice(1)),
    }
  }
  if (!value.startsWith("/")) {
    return value.includes("=")
      ? { pathname: "/", searchParams: new URLSearchParams(value) }
      : null
  }
  const searchIndex = value.indexOf("?")
  const rawPathname = searchIndex === -1 ? value : value.slice(0, searchIndex)
  return {
    pathname: rawPathname || "/",
    searchParams: new URLSearchParams(searchIndex === -1 ? "" : value.slice(searchIndex + 1)),
  }
}

function getRadarLocation(url: URL, location: SourceRadarMatch["location"]): ParsedRadarLocation | null {
  return location === "hash"
    ? getHashLocation(url)
    : { pathname: url.pathname, searchParams: url.searchParams }
}

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim().length > 0
}

function createTemplateVariables(
  context: RadarMatchContext,
): Record<string, unknown> {
  return createSourceTemplateScope(context.source.vars, {
    page: context.page,
    params: createTemplateRecord(Object.entries(context.params)),
    path: createTemplateRecord(Object.entries(context.pathParams)),
    query: context.queryParams,
  }) as Record<string, unknown>
}

function resolveRadarLocation(
  context: RadarContext,
  rulesByHost: Map<string, CompiledRadarRule[]>,
): RadarLocation | null {
  try {
    const url = new URL(context.url)
    return {
      rules: rulesByHost.get(getHostname(url)) ?? [],
      url,
    }
  } catch {
    return null
  }
}

function hasRequiredQueryKeys(
  keys: string[],
  values: URLSearchParams,
): boolean {
  return keys.every(key => values.has(key))
}

function getLocationPatterns(
  paths: SourceRadarMatch["paths"],
): LocationPatterns {
  if (Array.isArray(paths)) {
    return { include: paths, exclude: [] }
  }
  return {
    include: paths?.include ?? [],
    exclude: paths?.exclude ?? [],
  }
}

function compilePathMatcher(pattern: string): PathMatcher {
  const pathMatcher = match<Record<string, string | string[]>>(pattern)
  const specificity = getPathSpecificity(pattern)
  return (pathname) => {
    const result = pathMatcher(pathname)
    if (!result) return null
    const params = Object.fromEntries(
      Object.entries(result.params)
        .map(([key, value]) => [key, Array.isArray(value) ? value.join("/") : value]),
    )
    return { params, specificity }
  }
}

function compilePathMatchers(patterns: string[]): PathMatcher[] {
  return patterns.map(compilePathMatcher)
}

function matchPathPatterns(
  includeMatchers: PathMatcher[],
  excludeMatchers: PathMatcher[],
  pathname: string,
): PathMatch | null {
  if (excludeMatchers.some(matcher => matcher(pathname) !== null)) return null
  if (includeMatchers.length === 0) {
    return { params: {}, specificity: HOST_SPECIFICITY }
  }

  let bestMatch: PathMatch | null = null
  for (const matcher of includeMatchers) {
    const pathMatch = matcher(pathname)
    if (
      pathMatch
      && (!bestMatch || compareMatchSpecificity(pathMatch.specificity, bestMatch.specificity) > 0)
    ) {
      bestMatch = pathMatch
    }
  }
  return bestMatch
}

function getPathSpecificity(pattern: string): MatchSpecificity {
  const segments = pattern.split("/").filter(Boolean)
  const dynamicSegments = segments.filter(segment => /[:*]/.test(segment)).length
  const wildcardSegments = segments.filter(segment => segment.includes("*")).length
  return {
    pathKind: dynamicSegments === 0
      ? EXACT_PATH_KIND
      : wildcardSegments > 0
        ? WILDCARD_PATH_KIND
        : PARAMETERIZED_PATH_KIND,
    dynamicSegments,
    granularity: PATH_MATCH_GRANULARITY,
    pathDepth: segments.length,
    staticSegments: segments.length - dynamicSegments,
    requiredQueryKeys: 0,
    wildcardSegments,
  }
}

function addQuerySpecificity(
  base: MatchSpecificity,
  requiredQueryKeys: number,
): MatchSpecificity {
  return {
    ...base,
    granularity: requiredQueryKeys > 0 ? QUERY_MATCH_GRANULARITY : base.granularity,
    requiredQueryKeys: base.requiredQueryKeys + requiredQueryKeys,
  }
}

function compileLocationMatcher(matchSpec: SourceRadarMatch): LocationMatcher {
  const pathPatterns = getLocationPatterns(matchSpec.paths)
  const pathIncludes = compilePathMatchers(pathPatterns.include)
  const pathExcludes = compilePathMatchers(pathPatterns.exclude)
  const queryKeys = matchSpec.query ?? []

  return (url) => {
    const location = getRadarLocation(url, matchSpec.location)
    if (!location) return null
    const pathMatch = matchPathPatterns(pathIncludes, pathExcludes, location.pathname)
    if (!pathMatch || !hasRequiredQueryKeys(queryKeys, location.searchParams)) return null

    return {
      pathParams: pathMatch.params,
      queryParams: createTemplateRecord(location.searchParams),
      specificity: addQuerySpecificity(pathMatch.specificity, queryKeys.length),
    }
  }
}

function compareMatchSpecificity(left: MatchSpecificity, right: MatchSpecificity): number {
  return left.granularity - right.granularity
    || left.pathKind - right.pathKind
    || left.staticSegments - right.staticSegments
    || left.pathDepth - right.pathDepth
    || left.requiredQueryKeys - right.requiredQueryKeys
    || right.dynamicSegments - left.dynamicSegments
    || right.wildcardSegments - left.wildcardSegments
}

function compileRadarMetadata(
  field: HtmlField,
  location: string,
): CompiledRadarMetadata {
  if (typeof field === "string") {
    return {
      kind: "template",
      template: compileSourceTemplate(field, {
        location,
        slot: "radarMetadata",
      }),
    }
  }

  return {
    kind: "field",
    query: createRadarPageQuery(field),
    ...(field.template
      ? {
          template: compileSourceTemplate(field.template, {
            location: `${location}.template`,
            slot: "field",
          }),
        }
      : {}),
  }
}

function compileRadarRule(sourceRule: SourceRuleSpec, rule: SourceRadarRule): CompiledRadarRule | null {
  try {
    const templateLocation = `${sourceRule.source.id}.radar.${rule.id}.patch`
    const paramTemplates = Object.fromEntries(
      Object.entries(rule.patch?.params ?? {})
        .filter((entry): entry is [string, string] => typeof entry[1] === "string")
        .map(([key, template]) => [
          key,
          compileSourceTemplate(template, {
            location: `${templateLocation}.params.${key}`,
            slot: "radarParams",
          }),
        ]),
    )
    const paramScripts = Object.fromEntries(
      Object.entries(rule.patch?.params ?? {})
        .filter((entry): entry is [string, SourceRadarParamScript] => (
          typeof entry[1] === "function"
        ))
        .map(([key, script]) => [
          key,
          {
            key: `${sourceRule.source.id}:${rule.id}:${key}`,
            script,
          },
        ]),
    )
    const metadata = Object.fromEntries(
      Object.entries(rule.patch?.metadata ?? {})
        .filter((entry): entry is [keyof SourceRadarMetadata, HtmlField] =>
          entry[1] !== undefined)
        .map(([key, field]) => [
          key,
          compileRadarMetadata(field, `${templateLocation}.metadata.${key}`),
        ]),
    )

    return {
      metadata,
      source: sourceRule.source,
      rule,
      hosts: rule.match.hosts.map(normalizeHostname),
      locationMatcher: compileLocationMatcher(rule.match),
      paramScripts,
      paramTemplates,
    }
  } catch (error) {
    reportTemplateError(error)
    return null
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
  rule: CompiledRadarRule,
  context: RadarMatchContext,
  input: RadarContext,
): Record<string, unknown> | null {
  const parameterValues: Record<string, unknown> = {}

  try {
    const scope = createTemplateVariables(context)
    for (const [key, template] of Object.entries(rule.paramTemplates)) {
      const value = template.render(scope)
      if (isPresent(value)) {
        parameterValues[key] = value
      }
    }
    for (const [key, pageScript] of Object.entries(rule.paramScripts)) {
      const value = input.pageScriptValues?.[pageScript.key]
      if (isPresent(value)) {
        parameterValues[key] = value
      }
    }

    const validation = validateSourceParamPatch(context.source.params, parameterValues)
    return validation.valid ? validation.values : null
  } catch (error) {
    if (error instanceof TemplateRenderError) {
      reportTemplateError(error)
    }
    return null
  }
}

function resolveMetaPatchValue(
  key: keyof SourceRadarMetadata,
  metadata: CompiledRadarMetadata | undefined,
  context: RadarMatchContext,
  extractedItem: Record<string, string>,
): unknown {
  if (!metadata) {
    return undefined
  }
  if (metadata.kind === "template") {
    return metadata.template.render(createTemplateVariables(context))
  }

  const value = extractedItem[key] ?? ""
  return metadata.template
    ? metadata.template.render(createSourceTemplateScope(context.source.vars, {
        index: 0,
        item: extractedItem,
        params: context.params,
        request: {
          url: context.url.toString(),
        },
        value,
      }))
    : value
}

function resolveMetaPatch(
  rule: CompiledRadarRule,
  context: RadarMatchContext,
  input: RadarContext,
): SourceInstanceMetadata {
  const metadata: SourceInstanceMetadata = {
    home: context.url.toString(),
  }
  const extractedItem = Object.fromEntries(
    Object.entries(rule.metadata)
      .filter((entry): entry is [string, Extract<CompiledRadarMetadata, { kind: "field" }>] =>
        entry[1]?.kind === "field")
      .map(([fieldKey, field]) => [
        fieldKey,
        input.pageSelections?.[getRadarPageQueryKey(field.query)] ?? "",
      ]),
  )
  const title = resolveMetaPatchValue("title", rule.metadata.title, context, extractedItem)
  const badge = resolveMetaPatchValue("badge", rule.metadata.badge, context, extractedItem)
  const desc = resolveMetaPatchValue("desc", rule.metadata.desc, context, extractedItem)
  const home = resolveMetaPatchValue("home", rule.metadata.home, context, extractedItem)

  if (isPresent(title)) {
    metadata.title = String(title)
  }
  if (isPresent(badge)) {
    metadata.badge = resolveSourceUrl(String(badge), context.source.baseUrl)
  }
  if (isPresent(desc)) {
    metadata.desc = String(desc)
  }
  if (isPresent(home)) {
    metadata.home = resolveSourceUrl(String(home), context.source.baseUrl)
  }
  return metadata
}

function matchCompiledRule(
  compiledRule: CompiledRadarRule,
  input: RadarContext,
  url: URL,
): RankedRadarSuggestion | null {
  const locationMatch = compiledRule.locationMatcher(url)
  if (!locationMatch) {
    return null
  }

  const baseContext = {
    page: {
      title: input.title ?? "",
    },
    url,
    pathParams: locationMatch.pathParams,
    queryParams: locationMatch.queryParams,
    source: compiledRule.source,
  }
  const paramsContext: RadarMatchContext = {
    ...baseContext,
    params: {},
  }
  const params = resolveParamsPatch(compiledRule, paramsContext, input)
  if (!params) {
    return null
  }

  const context: RadarMatchContext = {
    ...paramsContext,
    params: parseSourceParams(compiledRule.source.params, params),
  }

  try {
    return {
      priority: compiledRule.rule.priority ?? 0,
      specificity: locationMatch.specificity,
      suggestion: createRadarSuggestion({
        ruleId: compiledRule.rule.id,
        sourceId: compiledRule.source.id,
        patch: {
          params,
          metadata: resolveMetaPatch(compiledRule, context, input),
        },
      }),
    }
  } catch (error) {
    reportTemplateError(error)
    return null
  }
}

function compareRankedSuggestions(
  left: RankedRadarSuggestion,
  right: RankedRadarSuggestion,
): number {
  return compareMatchSpecificity(left.specificity, right.specificity)
    || left.priority - right.priority
}

function getPageQueries(
  context: RadarContext,
  rulesByHost: Map<string, CompiledRadarRule[]>,
): RadarPageQuery[] {
  const location = resolveRadarLocation(context, rulesByHost)
  if (!location) {
    return []
  }

  const queries = new Map<string, RadarPageQuery>()
  for (const rule of location.rules) {
    if (!rule.locationMatcher(location.url)) continue

    for (const metadata of Object.values(rule.metadata)) {
      if (metadata?.kind !== "field") continue
      queries.set(getRadarPageQueryKey(metadata.query), metadata.query)
    }
  }

  return [...queries.values()]
}

function getPageScripts(
  context: RadarContext,
  rulesByHost: Map<string, CompiledRadarRule[]>,
): RadarPageScript[] {
  const location = resolveRadarLocation(context, rulesByHost)
  if (!location) return []

  const scripts = new Map<string, RadarPageScript>()
  for (const rule of location.rules) {
    if (!rule.locationMatcher(location.url)) continue
    for (const pageScript of Object.values(rule.paramScripts)) {
      scripts.set(pageScript.key, pageScript)
    }
  }
  return [...scripts.values()]
}

function createSuggestions(
  context: RadarContext,
  rulesByHost: Map<string, CompiledRadarRule[]>,
): RadarSuggestion[] {
  const location = resolveRadarLocation(context, rulesByHost)
  if (!location) {
    return []
  }

  const rankedSuggestions = location.rules
    .map(rule => matchCompiledRule(rule, context, location.url))
    .filter((suggestion): suggestion is RankedRadarSuggestion => suggestion !== null)
  const suggestionsById = new Map<string, RankedRadarSuggestion>()

  for (const rankedSuggestion of rankedSuggestions) {
    const existing = suggestionsById.get(rankedSuggestion.suggestion.id)
    if (
      !existing
      || compareRankedSuggestions(rankedSuggestion, existing) > 0
    ) {
      suggestionsById.set(rankedSuggestion.suggestion.id, rankedSuggestion)
    }
  }

  return [...suggestionsById.values()]
    .sort((left, right) => compareRankedSuggestions(right, left))
    .map(({ suggestion }) => suggestion)
}

function getSourceRuleSpecs(sourceMetadata: RadarSourceMetadata[] | undefined): SourceRuleSpec[] {
  return sourceMetadata
    ?.flatMap((source) => {
      if (source.radar !== undefined) {
        return source.radar.length ? [{ source, rules: source.radar }] : []
      }

      const homeValue = source.metadata?.home
      if (!homeValue || Object.keys(source.params ?? {}).length > 0) {
        return []
      }

      try {
        const home = new URL(homeValue)
        if (!["http:", "https:"].includes(home.protocol) || !home.hostname) {
          return []
        }

        return [{
          source,
          rules: [{
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
    getPageQueries: context => getPageQueries(context, rulesByHost),
    getPageScripts: context => getPageScripts(context, rulesByHost),
    getSuggestions: context => createSuggestions(context, rulesByHost),
  }

  matcherCache.set(sourceMetadata, radarMatcher)
  return radarMatcher
}

export function getRadarSuggestions(context: RadarContext, sourceMetadata?: RadarSourceMetadata[]): RadarSuggestion[] {
  return createRadarMatcher(sourceMetadata).getSuggestions(context)
}
