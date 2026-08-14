import type { Template } from "liquidjs"
import type { SourceTemplateVars } from "../types"
import { parseRelativeDate } from "@newsnext/date-parser"
import { getFavicon } from "@newsnext/shared/utils"
import { Liquid } from "liquidjs"
import { compileSourceRegex, validateSourceRegexInput } from "./regex"

type TemplateRenderer = (context: object) => string
export type TemplateOutput = "html" | "plain"

export type SourceTemplateSlot
  = | "field"
    | "item"
    | "jsonField"
    | "radarMetadata"
    | "radarParams"
    | "request"

export interface CompiledSourceTemplate {
  readonly location: string
  readonly output: TemplateOutput
  readonly render: TemplateRenderer
  readonly slot: SourceTemplateSlot
}

export interface CompiledSourceTemplateValue<T> {
  readonly render: (context: object) => T
}

export interface SourceTemplateCompileOptions {
  location: string
  output?: TemplateOutput
  slot: SourceTemplateSlot
}

const PARSE_LIMIT = 20_000
const RENDER_LIMIT_MS = 50
const MEMORY_LIMIT = 100_000
const TEMPLATE_LIMIT = 10_000
const CACHE_LIMIT = 256
const blockedTags = /\{%-?\s*(?:include|layout|liquid|raw|render)\b/i
const blockedRawFilter = /\|\s*raw\b/i
const regexCache = new Map<string, RegExp>()
const reportedTemplateErrors = new Map<string, true>()

export class TemplateValidationError extends Error {
  location: string

  constructor(location: string, cause: unknown) {
    const detail = cause instanceof Error ? `: ${cause.message}` : ""
    super(`Invalid Liquid template at ${location}${detail}`, { cause })
    this.name = "TemplateValidationError"
    this.location = location
  }
}

export class TemplateRenderError extends Error {
  readonly location: string
  readonly slot: SourceTemplateSlot

  constructor(location: string, slot: SourceTemplateSlot, cause: unknown) {
    const detail = cause instanceof Error ? `: ${cause.message}` : ""
    super(`Failed to render Liquid template at ${location}${detail}`, { cause })
    this.name = "TemplateRenderError"
    this.location = location
    this.slot = slot
  }
}

export function reportTemplateError(error: unknown): void {
  const key = error instanceof Error
    ? `${error.name}\0${error.message}`
    : String(error)
  if (reportedTemplateErrors.has(key)) return

  setCached(reportedTemplateErrors, key, true)
  console.error("Source Liquid template failed", error)
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
  engine.registerFilter("compact_number", (value: unknown) => {
    const number = Number(value)
    if (!Number.isFinite(number)) return ""
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(number)
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
  engine.registerFilter("relative_date_to_ms", (value: unknown, timezone: unknown = undefined) => {
    const date = parseRelativeDate(
      stringify(value),
      timezone === undefined ? undefined : stringify(timezone),
    )
    const timestamp = date.getTime()
    return Number.isFinite(timestamp) ? timestamp : undefined
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
const sourceTemplatePaths = {
  field: [
    "scope.index",
    "scope.item",
    "scope.params",
    "scope.request.url",
    "scope.value",
    "source.vars",
  ],
  item: [
    "scope.item",
  ],
  jsonField: [
    "scope.index",
    "scope.item",
    "scope.params",
    "scope.request.url",
    "scope.response.json",
    "scope.value",
    "source.vars",
  ],
  radarMetadata: [
    "scope.hashQuery",
    "scope.params",
    "scope.page",
    "scope.path",
    "scope.query",
    "source.vars",
  ],
  radarParams: [
    "scope.hashQuery",
    "scope.path",
    "scope.query",
    "source.vars",
  ],
  request: ["scope.params", "source.vars"],
} as const satisfies Record<SourceTemplateSlot, readonly string[]>
const sourceTemplatePrograms = new Map<string, TemplateRenderer>()
const sourceTemplateBindings = new Map<string, CompiledSourceTemplate>()

export function isTemplate(value: string): boolean {
  return value.includes("{{") || value.includes("{%")
}

export function renderTemplate(template: string, context: object): string {
  return getRenderer(template, "plain")(context)
}

export function renderHtmlTemplate(template: string, context: object): string {
  return getRenderer(template, "html")(context)
}

export function compileSourceTemplate(
  template: string,
  options: SourceTemplateCompileOptions,
): CompiledSourceTemplate {
  const { location, slot, output = "plain" } = options
  const programKey = `${slot}\0${output}\0${template}`
  const bindingKey = `${programKey}\0${location}`
  const cachedBinding = sourceTemplateBindings.get(bindingKey)
  if (cachedBinding) return cachedBinding

  let program = sourceTemplatePrograms.get(programKey)
  if (!program) {
    if (isTemplate(template)) {
      try {
        const parsed = getParsedTemplate(template, output)
        validateTemplatePaths(parsed, sourceTemplatePaths[slot], output)
        program = getRenderer(template, output)
      } catch (error) {
        throw new TemplateValidationError(location, error)
      }
    } else {
      program = () => template
    }
    setCached(sourceTemplatePrograms, programKey, program)
  }

  const compiled = Object.freeze({
    location,
    output,
    render(context: object): string {
      try {
        return program(context)
      } catch (error) {
        throw new TemplateRenderError(location, slot, error)
      }
    },
    slot,
  } satisfies CompiledSourceTemplate)
  setCached(sourceTemplateBindings, bindingKey, compiled)
  return compiled
}

export function compileSourceTemplateValue<T>(
  value: T,
  options: SourceTemplateCompileOptions,
): CompiledSourceTemplateValue<T> {
  if (typeof value === "string") {
    if (!isTemplate(value)) return constantTemplateValue(value)
    const binding = compileSourceTemplate(value, options)
    return Object.freeze({
      render: (context: object) => binding.render(context) as T,
    })
  }

  if (Array.isArray(value)) {
    const children = value.map((child, index) => compileSourceTemplateValue(
      child,
      {
        ...options,
        location: `${options.location}.${index}`,
      },
    ))
    return Object.freeze({
      render: (context: object) => children.map(child => child.render(context)) as T,
    })
  }

  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    return constantTemplateValue(value)
  }

  const children = Object.entries(value).map(([key, child]) => [
    key,
    compileSourceTemplateValue(child, {
      ...options,
      location: `${options.location}.${key}`,
    }),
  ] as const)
  return Object.freeze({
    render: (context: object) => Object.fromEntries(
      children.map(([key, child]) => [
        key,
        child.render(context),
      ]),
    ) as T,
  })
}

export function createSourceTemplateScope(
  vars: SourceTemplateVars | undefined,
  scope: object,
): object {
  return {
    scope,
    source: {
      vars: vars ?? {},
    },
  }
}

function constantTemplateValue<T>(value: T): CompiledSourceTemplateValue<T> {
  return Object.freeze({ render: () => value })
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

function validateTemplatePaths(
  template: Template[],
  allowedPaths: readonly string[],
  output: "html" | "plain",
): void {
  const variables = engines[output].globalFullVariablesSync(template, { partials: false })

  for (const path of variables) {
    if (!allowedPaths.some(allowedPath => isAllowedTemplatePath(path, allowedPath))) {
      throw new Error(
        `Template path "${path}" is not available; expected one of: ${allowedPaths.join(", ")}`,
      )
    }
  }
}

function isAllowedTemplatePath(path: string, allowedPath: string): boolean {
  if (
    path === "scope"
    || path === "source"
    || path === allowedPath
  ) {
    return true
  }
  return path.startsWith(`${allowedPath}.`) || path.startsWith(`${allowedPath}[`)
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
  validateSourceRegexInput(input)
  return input
}

function getRegex(patternValue: unknown, global = false): RegExp {
  const pattern = stringify(patternValue)
  const key = `${global ? "g" : ""}:${pattern}`
  const cached = regexCache.get(key)
  if (cached) return cached

  const regex = compileSourceRegex(pattern, global ? "g" : "")
  setCached(regexCache, key, regex)
  return regex
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
