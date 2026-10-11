import type { Template } from "liquidjs"
import type { SourceTemplateVars } from "../types"
import { Liquid } from "liquidjs"
import { sourceFilters } from "./source-filters"

type TemplateRenderer = (context: object) => string
export type TemplateOutput = "html" | "plain"

export type SourceTemplateSlot
  = | "field"
    | "annotation"
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
const blockedRawFilter = /\|\s*raw\b/i
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

function createEngine(output: TemplateOutput): Liquid {
  const engine = new Liquid({
    cache: 256,
    memoryLimit: MEMORY_LIMIT,
    outputEscape: output === "html" ? "escape" : undefined,
    ownPropertyOnly: true,
    parseLimit: PARSE_LIMIT,
    renderLimit: RENDER_LIMIT_MS,
    strictFilters: true,
    strictVariables: true,
  })

  for (const [name, filter] of Object.entries(sourceFilters)) {
    engine.registerFilter(name, filter)
  }

  return engine
}

const engines: Partial<Record<TemplateOutput, Liquid>> = {}

function getEngine(output: TemplateOutput): Liquid {
  return engines[output] ??= createEngine(output)
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
  annotation: [
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
    "scope.params",
    "scope.page",
    "scope.path",
    "scope.query",
    "source.vars",
  ],
  radarParams: [
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

function getParsedTemplate(template: string, output: TemplateOutput): Template[] {
  assertSafeTemplate(template)
  const cached = parsedTemplates[output].get(template)
  if (cached) return cached

  const parsed = getEngine(output).parse(template)
  setCached(parsedTemplates[output], template, parsed)
  return parsed
}

function getRenderer(template: string, output: TemplateOutput): TemplateRenderer {
  const cached = renderers[output].get(template)
  if (cached) return cached

  const parsed = getParsedTemplate(template, output)
  const renderer: TemplateRenderer = context => String(getEngine(output).renderSync(
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
  output: TemplateOutput,
): void {
  const variables = getEngine(output).globalFullVariablesSync(template, { partials: false })

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
  if (template.includes("{%")) {
    throw new Error("Template tags are not allowed; use interpolation or TypeScript")
  }
  if (blockedRawFilter.test(template)) {
    throw new Error("The raw filter is not allowed")
  }
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
