import type { CompiledSourceTemplateValue, SourceTemplateCompileOptions } from "./template"
import { getSourceTemplateProgram, TemplateRenderError, TemplateValidationError } from "./template"
import { compileTemplateTree } from "./template-tree"

/** Preserve JSON types for whole expressions; string composition always stays text. */
export function compileSourceJsonTemplate(
  value: unknown,
  options: SourceTemplateCompileOptions,
): CompiledSourceTemplateValue<unknown> {
  let jsonInput: unknown
  try {
    jsonInput = normalizeTemplateJson(value, 0, { nodes: 0 })
  } catch (error) {
    throw new TemplateValidationError(options.location, error)
  }
  const tree = compileTemplateTree(jsonInput, options, (template, bindingOptions) => {
    const program = getSourceTemplateProgram(template, bindingOptions)
    return {
      render(context: object): unknown {
        try {
          const value = program.renderValue(context)
          if (value === undefined) throw new Error("JSON request value is missing")
          return value
        } catch (error) {
          throw new TemplateRenderError(bindingOptions.location, bindingOptions.slot, error)
        }
      },
    }
  })
  return {
    render(context: object): unknown {
      const result = tree.render(context)
      try {
        const json = normalizeTemplateJson(result, 0, { nodes: 0 })
        if (JSON.stringify(json).length > 100_000) throw new Error("Template JSON cannot exceed 100000 characters")
        return json
      } catch (error) {
        throw new TemplateRenderError(options.location, options.slot, error)
      }
    },
  }
}

function normalizeTemplateJson(value: unknown, depth: number, budget: { nodes: number }): unknown {
  if (depth > 16 || ++budget.nodes > 10_000) throw new Error("Template JSON exceeds nesting or value limits")
  if (value === null || typeof value === "boolean") return value
  if (typeof value === "string" && value.length <= 100_000) return value
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (Array.isArray(value)) {
    return Array.from(value, child => normalizeTemplateJson(child, depth + 1, budget))
  }
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalizeTemplateJson(child, depth + 1, budget)]))
  }
  throw new TypeError("Template JSON must contain only strings, finite numbers, booleans, null, arrays, and plain objects")
}
