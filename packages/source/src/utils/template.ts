import type { Template } from "liquidjs"
import { getFavicon } from "@newsnext/shared/utils"
import { Liquid } from "liquidjs"

type TemplateRenderer = (context: object) => string

const PARSE_LIMIT = 20_000
const RENDER_LIMIT_MS = 50
const MEMORY_LIMIT = 100_000
const TEMPLATE_LIMIT = 10_000
const CACHE_LIMIT = 256
const REGEX_INPUT_LIMIT = 20_000
const REGEX_PATTERN_LIMIT = 500
const blockedTags = /\{%-?\s*(?:include|layout|liquid|raw|render)\b/i
const blockedRawFilter = /\|\s*raw\b/i
const regexCache = new Map<string, RegExp>()

export interface TemplateValidationOptions {
  allowedRoots?: readonly string[]
  output?: "html" | "plain"
}

export class TemplateValidationError extends Error {
  location: string

  constructor(location: string, cause: unknown) {
    const detail = cause instanceof Error ? `: ${cause.message}` : ""
    super(`Invalid Liquid template at ${location}${detail}`, { cause })
    this.name = "TemplateValidationError"
    this.location = location
  }
}

function createEngine(output: "html" | "plain"): Liquid {
  const engine = new Liquid({
    cache: 256,
    lenientIf: true,
    memoryLimit: MEMORY_LIMIT,
    outputEscape: output === "html" ? "escape" : undefined,
    ownPropertyOnly: true,
    parseLimit: PARSE_LIMIT,
    renderLimit: RENDER_LIMIT_MS,
    strictFilters: true,
    strictVariables: true,
  })

  engine.registerFilter("required", (value: unknown) => {
    if (value === undefined || value === null || value === "") {
      throw new Error("Required template value is missing")
    }
    return value
  })
  engine.registerFilter("absolute_url", (value: unknown, base: unknown) => {
    return resolveUrl(value, base)
  })
  engine.registerFilter("css_url", (value: unknown) => {
    return extractCssUrl(value)
  })
  engine.registerFilter("date_to_ms", (value: unknown) => {
    const timestamp = Date.parse(stringify(value))
    return Number.isFinite(timestamp) ? timestamp : undefined
  })
  engine.registerFilter("first_line", (value: unknown) => {
    return firstLine(value)
  })
  engine.registerFilter("favicon_url", (value: unknown) => {
    return getFavicon(stringify(value))
  })
  engine.registerFilter("normalize_lines", (value: unknown, spacing: unknown = 1) => {
    const lineSpacing = Number(spacing)
    if (!Number.isInteger(lineSpacing) || lineSpacing < 1 || lineSpacing > 4) {
      throw new Error("The normalize_lines spacing must be an integer from 1 through 4")
    }
    return normalizeLines(value, "\n".repeat(lineSpacing))
  })
  engine.registerFilter("normalize_whitespace", (value: unknown) => {
    return stringify(value).replace(/\s+/g, " ").trim()
  })
  engine.registerFilter("regex_extract", (value: unknown, pattern: unknown, group: unknown = 1) => {
    const input = getRegexInput(value)
    const match = getRegex(pattern).exec(input)
    if (!match) return ""

    const groupIndex = Number(group)
    if (!Number.isInteger(groupIndex) || groupIndex < 0 || groupIndex > 99) {
      throw new Error("The regex_extract group must be an integer from 0 through 99")
    }
    return match[groupIndex] ?? ""
  })
  engine.registerFilter("regex_replace", (value: unknown, pattern: unknown, replacement: unknown = "") => {
    return getRegexInput(value).replace(getRegex(pattern, true), stringify(replacement))
  })
  engine.registerFilter("url_path", encodeUrlComponent)
  engine.registerFilter("url_query", encodeUrlComponent)

  return engine
}

const engines = {
  html: createEngine("html"),
  plain: createEngine("plain"),
}
const parsedTemplates = {
  html: new Map<string, Template[]>(),
  plain: new Map<string, Template[]>(),
}
const renderers = {
  html: new Map<string, TemplateRenderer>(),
  plain: new Map<string, TemplateRenderer>(),
}

export function isTemplate(value: string): boolean {
  return value.includes("{{") || value.includes("{%")
}

export function renderTemplate(template: string, context: object): string {
  return getRenderer(template, "plain")(context)
}

export function renderHtmlTemplate(template: string, context: object): string {
  return getRenderer(template, "html")(context)
}

export function validateTemplate(
  template: string,
  options: TemplateValidationOptions = {},
): void {
  getParsedTemplate(template, options.output ?? "plain")
}

export function validateTemplates(
  value: unknown,
  location: string,
  options: TemplateValidationOptions = {},
): void {
  if (typeof value === "string") {
    if (!isTemplate(value)) return

    const output = options.output
      ?? (/\.html(?:\.template)?$/.test(location) ? "html" : "plain")
    try {
      const parsed = getParsedTemplate(value, output)
      if (options.allowedRoots) {
        validateTemplateRoots(parsed, options.allowedRoots, output)
      }
    } catch (error) {
      throw new TemplateValidationError(location, error)
    }
    return
  }

  if (Array.isArray(value)) {
    value.forEach((child, index) => validateTemplates(child, `${location}.${index}`, options))
    return
  }

  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    return
  }

  for (const [key, child] of Object.entries(value)) {
    validateTemplates(child, `${location}.${key}`, options)
  }
}

function getParsedTemplate(template: string, output: "html" | "plain"): Template[] {
  assertSafeTemplate(template)
  const cached = parsedTemplates[output].get(template)
  if (cached) return cached

  const parsed = engines[output].parse(template)
  setCached(parsedTemplates[output], template, parsed)
  return parsed
}

function getRenderer(template: string, output: "html" | "plain"): TemplateRenderer {
  const cached = renderers[output].get(template)
  if (cached) return cached

  const parsed = getParsedTemplate(template, output)
  const renderer: TemplateRenderer = context => String(engines[output].renderSync(
    parsed,
    context,
    {
      memoryLimit: MEMORY_LIMIT,
      ownPropertyOnly: true,
      renderLimit: RENDER_LIMIT_MS,
      templateLimit: TEMPLATE_LIMIT,
    },
  ))
  setCached(renderers[output], template, renderer)
  return renderer
}

function validateTemplateRoots(
  template: Template[],
  allowedRoots: readonly string[],
  output: "html" | "plain",
): void {
  const allowed = new Set(allowedRoots)
  const variables = engines[output].globalVariablesSync(template, { partials: false })

  for (const variable of variables) {
    if (!allowed.has(variable)) {
      throw new Error(
        `Template root "${variable}" is not available; expected one of: ${allowedRoots.join(", ")}`,
      )
    }
  }
}

function assertSafeTemplate(template: string): void {
  if (blockedTags.test(template)) {
    throw new Error("File inclusion, layouts, and raw blocks are not allowed")
  }
  if (blockedRawFilter.test(template)) {
    throw new Error("The raw filter is not allowed")
  }
}

function encodeUrlComponent(value: unknown): string {
  return encodeURIComponent(String(value ?? ""))
}

function extractCssUrl(value: unknown): string | undefined {
  const css = stringify(value)
  const start = css.toLowerCase().indexOf("url(")
  if (start === -1) return undefined

  const content = css.slice(start + 4).trimStart()
  const quote = content[0]
  if (quote === "\"" || quote === "'") {
    const end = content.indexOf(quote, 1)
    return end === -1 ? undefined : content.slice(1, end) || undefined
  }

  const end = content.indexOf(")")
  return end === -1 ? undefined : content.slice(0, end).trim() || undefined
}

function firstLine(value: unknown): string | undefined {
  return stringify(value)
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(Boolean)
}

function normalizeLines(value: unknown, separator: string): string {
  return stringify(value)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .join(separator)
}

function resolveUrl(value: unknown, base: unknown): string | undefined {
  const url = stringify(value)
  if (!url) return undefined

  const baseUrl = stringify(base)
  if (!baseUrl) {
    throw new Error("The absolute_url filter requires a base URL")
  }
  return new URL(url, baseUrl).href
}

function getRegexInput(value: unknown): string {
  const input = stringify(value)
  if (input.length > REGEX_INPUT_LIMIT) {
    throw new Error(`A regex filter input cannot exceed ${REGEX_INPUT_LIMIT} characters`)
  }
  return input
}

function getRegex(patternValue: unknown, global = false): RegExp {
  const pattern = stringify(patternValue)
  if (!pattern) {
    throw new Error("A regex filter requires a non-empty pattern")
  }
  if (pattern.length > REGEX_PATTERN_LIMIT) {
    throw new Error(`A regex filter pattern cannot exceed ${REGEX_PATTERN_LIMIT} characters`)
  }
  if (hasNestedQuantifiedGroup(pattern)) {
    throw new Error("Nested quantified groups are not allowed in regex filters")
  }

  const key = `${global ? "g" : ""}:${pattern}`
  const cached = regexCache.get(key)
  if (cached) return cached

  let regex: RegExp
  try {
    regex = new RegExp(pattern, global ? "g" : "")
  } catch (error) {
    throw new Error("Invalid regex filter pattern", { cause: error })
  }
  setCached(regexCache, key, regex)
  return regex
}

function hasNestedQuantifiedGroup(pattern: string): boolean {
  const groups: boolean[] = []
  let escaped = false
  let inCharacterClass = false

  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index]
    if (escaped) {
      escaped = false
      continue
    }
    if (character === "\\") {
      escaped = true
      continue
    }
    if (character === "[") {
      inCharacterClass = true
      continue
    }
    if (character === "]" && inCharacterClass) {
      inCharacterClass = false
      continue
    }
    if (inCharacterClass) continue

    if (character === "(") {
      groups.push(false)
      continue
    }
    if (character === ")") {
      const containsQuantifier = groups.pop() ?? false
      const groupIsQuantified = isRegexQuantifierAt(pattern, index + 1)
      if (containsQuantifier && groupIsQuantified) return true
      if (groups.length > 0 && (containsQuantifier || groupIsQuantified)) {
        groups[groups.length - 1] = true
      }
      continue
    }
    if (
      groups.length > 0
      && isRegexQuantifierAt(pattern, index)
      && !(character === "?" && pattern[index - 1] === "(")
    ) {
      groups[groups.length - 1] = true
    }
  }

  return false
}

function isRegexQuantifierAt(pattern: string, index: number): boolean {
  const character = pattern[index]
  if (character === "*" || character === "+" || character === "?") return true
  if (character !== "{") return false

  let cursor = index + 1
  let digits = 0
  while (cursor < pattern.length && pattern[cursor] >= "0" && pattern[cursor] <= "9") {
    cursor += 1
    digits += 1
  }
  if (digits === 0) return false
  if (pattern[cursor] === ",") {
    cursor += 1
    while (cursor < pattern.length && pattern[cursor] >= "0" && pattern[cursor] <= "9") {
      cursor += 1
    }
  }
  return pattern[cursor] === "}"
}

function setCached<T>(cache: Map<string, T>, key: string, value: T): void {
  if (cache.size >= CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value
    if (oldestKey !== undefined) {
      cache.delete(oldestKey)
    }
  }
  cache.set(key, value)
}

function stringify(value: unknown): string {
  return value === undefined || value === null ? "" : String(value)
}
