import type {
  SourceRadarCondition,
  SourceRadarParam,
  SourceRadarRule,
  SourceRadarTitle,
  SourceRadarTransform,
  SourceRadarValue,
} from "@newsnext/client-source/typings"

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
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("&")
}

function getHostname(url: URL): string {
  return url.hostname.replace(/^www\./, "").toLowerCase()
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
      return value.replace(new RegExp(transform.pattern), transform.replacement).trim()
    case "extract": {
      const match = new RegExp(transform.pattern).exec(value)
      if (!match) {
        return transform.fallbackToEmpty ? "" : value
      }

      return (match[transform.group ?? 1] ?? match[0] ?? "").trim()
    }
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

function matchPathTemplate(template: string, pathname: string): Record<string, string> | null {
  const pathParts = pathname.split("/").map(part => decodeURIComponent(part)).filter(Boolean)
  const templateParts = template.split("/").filter(Boolean)
  const params: Record<string, string> = {}

  for (let index = 0; index < templateParts.length; index += 1) {
    const templatePart = templateParts[index]
    const pathPart = pathParts[index]

    if (templatePart === "*") {
      return params
    }

    if (templatePart.startsWith(":")) {
      const rawName = templatePart.slice(1)
      const isRest = rawName.endsWith("*")
      const isOptional = rawName.endsWith("?")
      const name = rawName.replace(/[?*]$/, "")

      if (isRest) {
        const rest = pathParts.slice(index).join("/")
        if (!rest) {
          return null
        }
        params[name] = rest
        return params
      }

      if (!pathPart) {
        if (isOptional) {
          continue
        }
        return null
      }

      params[name] = pathPart
      continue
    }

    if (templatePart !== pathPart) {
      return null
    }
  }

  return pathParts.length === templateParts.length ? params : null
}

function getRuleHosts(rule: SourceRadarRule): string[] {
  return rule.match?.hosts ?? rule.hosts ?? []
}

function getRulePaths(rule: SourceRadarRule): string[] | undefined {
  return rule.match?.paths ?? rule.paths
}

function getRuleIncludes(rule: SourceRadarRule): string[] {
  const includes = rule.match?.includes
  if (!includes) {
    return []
  }

  return Array.isArray(includes) ? includes : [includes]
}

function matchRulePath(rule: SourceRadarRule, url: URL): Record<string, string> | null {
  const paths = getRulePaths(rule)
  if (!paths?.length) {
    return {}
  }

  for (const pathTemplate of paths) {
    const params = matchPathTemplate(pathTemplate, url.pathname)
    if (params) {
      return params
    }
  }

  return null
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
      if (condition.pattern && !new RegExp(condition.pattern).test(value)) {
        return false
      }
      if (condition.startsWith && !value.startsWith(condition.startsWith)) {
        return false
      }
      if (condition.in && !condition.in.includes(value)) {
        return false
      }
      if (condition.notIn && condition.notIn.includes(value.toLowerCase())) {
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
  if (param.pattern && !new RegExp(param.pattern).test(stringValue)) {
    return false
  }
  if (param.startsWith && !stringValue.startsWith(param.startsWith)) {
    return false
  }
  if (param.in && !param.in.includes(stringValue)) {
    return false
  }
  if (param.notIn && param.notIn.includes(stringValue.toLowerCase())) {
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

function matchRule(sourceId: string, sourceTitle: string | undefined, rule: SourceRadarRule, input: RadarContext, url: URL): RadarSuggestion | null {
  const hostname = getHostname(url)
  if (!getRuleHosts(rule).includes(hostname)) {
    return null
  }

  const includes = getRuleIncludes(rule)
  if (includes.length && !includes.some(value => url.toString().includes(value))) {
    return null
  }

  const pathParams = matchRulePath(rule, url)
  if (!pathParams) {
    return null
  }

  const context: RadarMatchContext = { input, url, pathParams, sourceTitle }
  if (rule.conditions?.some(condition => !isConditionMatched(condition, context))) {
    return null
  }

  const params = resolveParams(rule, context)
  if (!params) {
    return null
  }

  const contextWithValues: RadarMatchContext = { ...context, values: params }

  return createRadarSuggestion({
    ruleId: rule.id,
    sourceId,
    title: resolveSuggestionTitle(rule.title, contextWithValues),
    params,
    confidence: rule.confidence,
  })
}

function getSourceRuleSpecs(sourceMetadata: RadarSourceMetadata[] | undefined): { sourceId: string, sourceTitle?: string, rules: SourceRadarRule[] }[] {
  return sourceMetadata
    ?.flatMap(source => source.radar?.length ? [{ sourceId: source.id, sourceTitle: source.title, rules: source.radar }] : [])
    ?? []
}

export function getRadarSuggestions(context: RadarContext, sourceMetadata?: RadarSourceMetadata[]): RadarSuggestion[] {
  let url: URL
  try {
    url = new URL(context.url)
  } catch {
    return []
  }

  const suggestions = getSourceRuleSpecs(sourceMetadata)
    .flatMap(sourceRule => sourceRule.rules.map(rule => matchRule(sourceRule.sourceId, sourceRule.sourceTitle, rule, context, url)))
    .filter((suggestion): suggestion is RadarSuggestion => suggestion !== null)
  const suggestionsById = new Map<string, RadarSuggestion>()

  for (const suggestion of suggestions) {
    suggestionsById.set(suggestion.id, suggestion)
  }

  return [...suggestionsById.values()].sort((a, b) => b.confidence - a.confidence)
}
