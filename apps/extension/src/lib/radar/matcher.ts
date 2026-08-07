import type { CompiledSourceTemplate } from "@newsnext/source/core"
import type {
  HtmlField,
  SourceDescriptor,
  SourcePresentationMetadata,
  SourceRadarMatch,
  SourceRadarMetadata,
  SourceRadarPathPattern,
  SourceRadarRule,
} from "@newsnext/source/types"
import type { RadarPageQuery } from "./page-query"
import type { SourceInstanceMetadata, SourceInstancePatch } from "@/lib/source"
import { getFavicon } from "@newsnext/shared/utils"
import {
  compileSourceRegex,
  compileSourceTemplate,
  createSourceTemplateScope,
  parseSourceParams,
  reportTemplateError,
  resolveSourceUrl,
  TemplateRenderError,
  validateSourceRegexInput,
} from "@newsnext/source/core"
import { match } from "path-to-regexp"
import {
  createRadarPageQuery,
  getRadarPageQueryKey,
} from "./page-query"

export interface RadarContext {
  url: string
  title?: string
  feeds?: RadarFeed[]
  pageSelections?: Record<string, string>
}

export interface RadarFeed {
  title?: string
  url: string
}

export interface RadarDiscoveryOptions {
  feeds: boolean
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
  "id" | "baseUrl" | "vars" | "params" | "radar"
> & {
  metadata?: SourcePresentationMetadata
}

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
const RSS_RADAR_CONFIDENCE = -1
const RSS_RADAR_RULE_ID = "page-feed"
const RSS_SOURCE_ID = "rss:feed"

type LocationMatcher = (url: URL) => Record<string, string> | null

interface LocationPatterns {
  include: SourceRadarPathPattern[]
  exclude: SourceRadarPathPattern[]
}

interface CompiledRadarRule {
  metadata: Partial<Record<keyof SourceRadarMetadata, CompiledRadarMetadata>>
  paramTemplates: Record<string, CompiledSourceTemplate>
  source: RadarSourceMetadata
  rule: SourceRadarRule
  hosts: string[]
  excludeMatchers: LocationMatcher[]
  includeMatchers: LocationMatcher[]
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
  getDiscoveryOptions: (context: RadarContext) => RadarDiscoveryOptions
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
  if (compiledRule.excludeMatchers.some(matcher => matcher(url) !== null)) {
    return null
  }

  for (const matcher of compiledRule.includeMatchers) {
    const params = matcher(url)
    if (params) return params
  }
  return null
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

function compileLocationMatcher(pattern: SourceRadarPathPattern): LocationMatcher | null {
  try {
    if (typeof pattern !== "string") {
      const regex = compileSourceRegex(pattern.regex, "i")
      return (url) => {
        const input = url.toString()
        try {
          validateSourceRegexInput(input)
        } catch {
          return null
        }
        const result = regex.exec(input)
        if (!result) {
          return null
        }
        return Object.fromEntries(
          Object.entries(result.groups ?? {})
            .filter((entry): entry is [string, string] => entry[1] !== undefined),
        )
      }
    }

    const matcher = match<Record<string, string | string[]>>(pattern)
    return (url) => {
      const result = matcher(url.pathname)
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

function compileLocationMatchers(patterns: SourceRadarPathPattern[]): LocationMatcher[] {
  return patterns
    .map(compileLocationMatcher)
    .filter((matcher): matcher is LocationMatcher => matcher !== null)
}

function getLocationPatterns(matchSpec: SourceRadarMatch): LocationPatterns {
  if (Array.isArray(matchSpec.paths)) {
    return {
      include: matchSpec.paths,
      exclude: [],
    }
  }

  return {
    include: matchSpec.paths?.include ?? [],
    exclude: matchSpec.paths?.exclude ?? [],
  }
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
  const patterns = getLocationPatterns(rule.match)
  const includeMatchers = patterns.include.length > 0
    ? compileLocationMatchers(patterns.include)
    : [() => ({})]
  if (!includeMatchers.length) {
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
      excludeMatchers: compileLocationMatchers(patterns.exclude),
      includeMatchers,
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
): RadarSuggestion | null {
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

function createRssSuggestions(
  context: RadarContext,
  pageUrl: URL,
  rssSource: RadarSourceMetadata | undefined,
): RadarSuggestion[] {
  if (
    !rssSource
    || !["http:", "https:"].includes(pageUrl.protocol)
  ) {
    return []
  }

  return (context.feeds ?? []).flatMap((feed) => {
    try {
      const feedUrl = new URL(feed.url, pageUrl)
      if (!["http:", "https:"].includes(feedUrl.protocol)) {
        return []
      }

      return [createRadarSuggestion({
        ruleId: RSS_RADAR_RULE_ID,
        sourceId: RSS_SOURCE_ID,
        patch: {
          params: {
            url: feedUrl.href,
          },
          metadata: {
            badge: getFavicon(pageUrl),
            home: pageUrl.href,
            title: feed.title?.trim() || rssSource.metadata?.title || "RSS Feed",
          },
        },
        confidence: RSS_RADAR_CONFIDENCE,
      })]
    } catch {
      return []
    }
  })
}

function createSuggestions(
  context: RadarContext,
  rulesByHost: Map<string, CompiledRadarRule[]>,
  rssSource: RadarSourceMetadata | undefined,
): RadarSuggestion[] {
  const location = resolveRadarLocation(context, rulesByHost)
  if (!location) {
    return []
  }

  const dedicatedSuggestions = location.rules
    .map(rule => matchCompiledRule(rule, context, location.url))
    .filter((suggestion): suggestion is RadarSuggestion => suggestion !== null)
  const suggestions = [
    ...dedicatedSuggestions,
    ...createRssSuggestions(context, location.url, rssSource),
  ]
  const suggestionsById = new Map<string, RadarSuggestion>()

  for (const suggestion of suggestions) {
    suggestionsById.set(suggestion.id, suggestion)
  }

  return [...suggestionsById.values()].sort((a, b) => b.confidence - a.confidence)
}

function isDiscoverablePage(context: RadarContext): boolean {
  try {
    return ["http:", "https:"].includes(new URL(context.url).protocol)
  } catch {
    return false
  }
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
  const rssSource = sourceMetadata.find(source => source.id === RSS_SOURCE_ID)
  const radarMatcher: RadarMatcher = {
    getDiscoveryOptions: (context) => {
      const discover = isDiscoverablePage(context)
      return {
        feeds: discover && rssSource !== undefined,
      }
    },
    getPageQueries: context => getPageQueries(context, rulesByHost),
    getSuggestions: context => createSuggestions(
      context,
      rulesByHost,
      rssSource,
    ),
  }

  matcherCache.set(sourceMetadata, radarMatcher)
  return radarMatcher
}

export function getRadarSuggestions(context: RadarContext, sourceMetadata?: RadarSourceMetadata[]): RadarSuggestion[] {
  return createRadarMatcher(sourceMetadata).getSuggestions(context)
}
