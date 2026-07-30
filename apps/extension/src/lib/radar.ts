import type { CompiledSourceTemplate } from "@newsnext/source/core"
import type {
  HtmlField,
  SourceDescriptor,
  SourceRadarMatch,
  SourceRadarMetadata,
  SourceRadarRule,
} from "@newsnext/source/types"
import type { RadarPageQuery } from "@/lib/radar-page-query"
import type { SourceInstanceMetadata, SourceInstancePatch } from "@/lib/source-cards"
import {
  compileSourceTemplate,
  createSourceTemplateScope,
  parseSourceParams,
  reportTemplateError,
  resolveSourceUrl,
  TemplateRenderError,
} from "@newsnext/source/core"
import { match } from "path-to-regexp"
import {
  createRadarPageQuery,
  getRadarPageQueryKey,
} from "@/lib/radar-page-query"

export interface RadarContext {
  url: string
  title?: string
  pageSelections?: Record<string, string>
}

export interface RadarSuggestion {
  id: string
  ruleId: string
  sourceId: string
  patch: SourceInstancePatch
  confidence: number
}

export type RadarSourceMetadata = Pick<
  SourceDescriptor,
  "id" | "baseUrl" | "title" | "badge" | "desc" | "home" | "vars" | "params" | "radar"
>

interface RadarMatchContext {
  url: URL
  page: Record<string, string>
  pathParams: Record<string, string>
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
const DEFAULT_ORIGIN_RADAR_CONFIDENCE = 0

type PathMatch = (pathname: string) => Record<string, string> | null

interface CompiledRadarRule {
  metadata: Partial<Record<keyof SourceRadarMetadata, CompiledRadarMetadata>>
  paramTemplates: Record<string, CompiledSourceTemplate>
  source: RadarSourceMetadata
  rule: SourceRadarRule
  hosts: string[]
  includes: string[]
  pathMatches: PathMatch[]
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
  return createSourceTemplateScope(context.source.vars, {
    hashQuery: getHashQueryParams(context.url),
    page: context.page,
    params: createTemplateRecord(Object.entries(context.params)),
    path: createTemplateRecord(Object.entries(context.pathParams)),
    query: getQueryParams(context.url.searchParams),
  }) as Record<string, unknown>
}

function matchRuleLocation(compiledRule: CompiledRadarRule, url: URL): Record<string, string> | null {
  if (compiledRule.includes.length && !compiledRule.includes.some(value => url.toString().includes(value))) {
    return null
  }

  return matchRulePath(compiledRule, url)
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
  const pathMatches = compilePathMatches(rule.match.paths)
  if (!pathMatches.length) {
    return null
  }

  try {
    const templateLocation = `${sourceRule.source.id}.radar.${rule.id}.patch`
    const paramTemplates = Object.fromEntries(
      Object.entries(rule.patch?.params ?? {}).map(([key, template]) => [
        key,
        compileSourceTemplate(template, {
          location: `${templateLocation}.params.${key}`,
          slot: "radarParams",
        }),
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
      includes: getMatchIncludes(rule.match),
      paramTemplates,
      pathMatches,
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

    return parseSourceParams(
      context.source.params,
      parameterValues,
      context.source.vars,
    )
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
  const type = resolveMetaPatchValue("type", rule.metadata.type, context, extractedItem)

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
  if (type === "hottest" || type === "timeline") {
    metadata.type = type
  }
  return metadata
}

function matchCompiledRule(compiledRule: CompiledRadarRule, input: RadarContext, url: URL): RadarSuggestion | null {
  const pathParams = matchRuleLocation(compiledRule, url)
  if (!pathParams) {
    return null
  }

  const baseContext = {
    page: {
      title: input.title ?? "",
    },
    url,
    pathParams,
    source: compiledRule.source,
  }
  const paramsContext: RadarMatchContext = {
    ...baseContext,
    params: {},
  }
  const params = resolveParamsPatch(compiledRule, paramsContext)
  if (!params) {
    return null
  }

  const context: RadarMatchContext = {
    ...paramsContext,
    params,
  }

  try {
    return createRadarSuggestion({
      ruleId: compiledRule.rule.id,
      sourceId: compiledRule.source.id,
      patch: {
        params,
        metadata: resolveMetaPatch(compiledRule, context, input),
      },
      confidence: compiledRule.rule.confidence,
    })
  } catch (error) {
    reportTemplateError(error)
    return null
  }
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
    if (!matchRuleLocation(rule, location.url)) continue

    for (const metadata of Object.values(rule.metadata)) {
      if (metadata?.kind !== "field") continue
      queries.set(getRadarPageQueryKey(metadata.query), metadata.query)
    }
  }

  return [...queries.values()]
}

function createSuggestions(context: RadarContext, rulesByHost: Map<string, CompiledRadarRule[]>): RadarSuggestion[] {
  const location = resolveRadarLocation(context, rulesByHost)
  if (!location) {
    return []
  }

  const suggestions = location.rules
    .map(rule => matchCompiledRule(rule, context, location.url))
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
    getPageQueries: context => getPageQueries(context, rulesByHost),
    getSuggestions: context => createSuggestions(context, rulesByHost),
  }

  matcherCache.set(sourceMetadata, radarMatcher)
  return radarMatcher
}

export function getRadarSuggestions(context: RadarContext, sourceMetadata?: RadarSourceMetadata[]): RadarSuggestion[] {
  return createRadarMatcher(sourceMetadata).getSuggestions(context)
}
