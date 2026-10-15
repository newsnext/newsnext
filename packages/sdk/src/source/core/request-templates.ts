import type { Options } from "ky"
import type { CompiledSourceTemplateValue } from "./template"
import { resolveSourceQuery, resolveSourceUrl } from "./base-url"
import { compileSourceTemplate, compileSourceTemplateValue, TemplateRenderError } from "./template"
import { compileSourceJsonTemplate } from "./template-json"
import { compileTemplateTree } from "./template-tree"

/** Headers/body text stay strings. Only fetchOptions.json preserves whole-expression types. */
export function compileSourceFetchOptions(value: Options | undefined, location: string): CompiledSourceTemplateValue<Options | undefined> {
  if (value?.json === undefined) return compileRequestOptions(value, location)
  const { json, ...textOptions } = value
  const text = compileRequestOptions(textOptions, location)
  const data = compileSourceJsonTemplate(json, { location: `${location}.json`, slot: "request" })
  return {
    render: context => ({ ...text.render(context), json: data.render(context) }),
  }
}

function compileRequestOptions<T>(value: T, location: string): CompiledSourceTemplateValue<T> {
  const tree = compileTemplateTree(value, { location, slot: "request" as const }, compileSourceTemplate)
  return tree as CompiledSourceTemplateValue<T>
}

interface SourceRequestConfig {
  url: string
  query?: Record<string, string | number | boolean | null>
  fetchOptions?: Options
}

export interface CompiledSourceRequest {
  /** Capability inference needs only the URL, without optional query/body values. */
  readonly renderUrl: (context: object, baseUrl: string | undefined) => string
  readonly renderRequestUrl: (context: object, baseUrl: string | undefined) => string
  readonly renderFetchOptions: (context: object) => Options | undefined
}

/** Compile once when resolving a Source; execution only supplies its parameter scope. */
export function compileSourceRequest(config: SourceRequestConfig, location: string): CompiledSourceRequest {
  validateSourceQuery(config.query, `${location}.query`)
  const url = compileSourceTemplate(config.url, { location: `${location}.url`, slot: "request" })
  const query = compileSourceTemplateValue(config.query, { location: `${location}.query`, slot: "request" })
  const fetchOptions = compileSourceFetchOptions(config.fetchOptions, `${location}.fetchOptions`)
  const renderUrl = (context: object, baseUrl: string | undefined): string => {
    const value = url.render(context)
    if (value.trim() === "") throw new TemplateRenderError(`${location}.url`, "request", new Error("Request URL is missing"))
    return resolveSourceUrl(value, baseUrl)
  }
  return {
    renderUrl,
    renderRequestUrl: (context, baseUrl) => resolveSourceQuery(renderUrl(context, baseUrl), query.render(context)),
    renderFetchOptions: context => fetchOptions.render(context),
  }
}

function validateSourceQuery(value: unknown, location: string): void {
  if (value === undefined) return
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.values(value).some(item =>
    item !== null && typeof item !== "string" && typeof item !== "boolean"
    && !(typeof item === "number" && Number.isFinite(item)),
  )) {
    throw new TypeError(`${location} must contain string, finite number, boolean, or null values`)
  }
}
