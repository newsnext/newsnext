import type { SourceTemplateVars } from "../types"
import type { CompiledInterpolation } from "./interpolation"
import type { SourceTemplateSlot } from "./template-policy"
import type { CompiledTemplateValue } from "./template-tree"
import { compileInterpolation } from "./interpolation"
import { sourceTemplatePaths } from "./template-policy"
import { compileTemplateTree } from "./template-tree"

export type { SourceTemplateSlot } from "./template-policy"

export type TemplateOutput = "html" | "plain"

export interface CompiledSourceTemplate {
  readonly location: string
  readonly output: TemplateOutput
  readonly render: (context: object) => string | undefined
  readonly slot: SourceTemplateSlot
}

export type CompiledSourceTemplateValue<T> = CompiledTemplateValue<T>

/** Text leaves can be absent; arrays and objects preserve their structure. */
export type InterpolatedValue<T>
  = T extends string ? string | undefined
    : T extends (...args: never[]) => unknown ? T
      : T extends object ? { [K in keyof T]: InterpolatedValue<T[K]> } : T

export interface SourceTemplateCompileOptions {
  location: string
  output?: TemplateOutput
  slot: SourceTemplateSlot
}

const CACHE_LIMIT = 256
const reportedTemplateErrors = new Map<string, true>()

export class TemplateValidationError extends Error {
  location: string

  constructor(location: string, cause: unknown) {
    const detail = cause instanceof Error ? `: ${cause.message}` : ""
    super(`Invalid source template at ${location}${detail}`, { cause })
    this.name = "TemplateValidationError"
    this.location = location
  }
}

export class TemplateRenderError extends Error {
  readonly location: string
  readonly slot: SourceTemplateSlot

  constructor(location: string, slot: SourceTemplateSlot, cause: unknown) {
    const detail = cause instanceof Error ? `: ${cause.message}` : ""
    super(`Failed to render source template at ${location}${detail}`, { cause })
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
  console.error("Source template failed", error)
}

const sourceTemplatePrograms = new Map<string, CompiledInterpolation>()
const sourceTemplateBindings = new Map<string, CompiledSourceTemplate>()

export { isTemplate } from "./template-tree"

export function compileSourceTemplate(
  template: string,
  options: SourceTemplateCompileOptions,
): CompiledSourceTemplate {
  const { location, slot, output = "plain" } = options
  const programKey = `${slot}\0${output}\0${template}`
  const bindingKey = `${programKey}\0${location}`
  const cachedBinding = sourceTemplateBindings.get(bindingKey)
  if (cachedBinding) return cachedBinding

  const program = getSourceTemplateProgram(template, options)

  const compiled = Object.freeze({
    location,
    output,
    render(context: object): string | undefined {
      try {
        return program.render(context)
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
): CompiledSourceTemplateValue<InterpolatedValue<T>> {
  const tree = compileTemplateTree(value, options, compileSourceTemplate)
  return tree as CompiledSourceTemplateValue<InterpolatedValue<T>>
}

export function getSourceTemplateProgram(template: string, options: SourceTemplateCompileOptions): CompiledInterpolation {
  const { slot, output = "plain", location } = options
  const key = `${slot}\0${output}\0${template}`
  const cached = sourceTemplatePrograms.get(key)
  if (cached) return cached
  try {
    const program = compileInterpolation(template, output === "html", sourceTemplatePaths[slot])
    setCached(sourceTemplatePrograms, key, program)
    return program
  } catch (error) {
    throw new TemplateValidationError(location, error)
  }
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

function setCached<T>(cache: Map<string, T>, key: string, value: T): void {
  if (cache.size >= CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value
    if (oldestKey !== undefined) {
      cache.delete(oldestKey)
    }
  }
  cache.set(key, value)
}
