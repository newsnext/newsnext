import type { Template } from "liquidjs"
import { Liquid } from "liquidjs"

type TemplateRenderer = (context: object) => string

const PARSE_LIMIT = 20_000
const RENDER_LIMIT_MS = 50
const MEMORY_LIMIT = 100_000
const TEMPLATE_LIMIT = 10_000
const CACHE_LIMIT = 256
const blockedTags = /\{%-?\s*(?:include|layout|liquid|raw|render)\b/i
const blockedRawFilter = /\|\s*raw\b/i

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

function setCached<T>(cache: Map<string, T>, key: string, value: T): void {
  if (cache.size >= CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value
    if (oldestKey !== undefined) {
      cache.delete(oldestKey)
    }
  }
  cache.set(key, value)
}
