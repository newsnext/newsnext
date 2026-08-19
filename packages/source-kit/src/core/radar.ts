import type {
  HtmlFieldConfig,
  SourceRadarRule,
} from "../types"
import { isSourcePresentationMetadataKey } from "../types"
import { SOURCE_REGISTRY_LIMITS } from "./limits"
import { compileSourceTemplate } from "./template"

export function validateRadarRules(
  rules: SourceRadarRule[] | undefined,
  location: string,
): void {
  rules?.forEach((rule, index) => {
    if (rule.priority !== undefined && !Number.isSafeInteger(rule.priority)) {
      throw new TypeError(`${location}.${index}.priority must be a safe integer`)
    }
    validateRadarMatch(rule.match, `${location}.${index}.match`)
    const patchLocation = `${location}.${index}.patch`
    for (const [key, template] of Object.entries(rule.patch?.params ?? {})) {
      if (typeof template === "function") continue
      compileSourceTemplate(template, {
        location: `${patchLocation}.params.${key}`,
        slot: "radarParams",
      })
    }
    for (const [key, field] of Object.entries(rule.patch?.metadata ?? {})) {
      if (!isSourcePresentationMetadataKey(key)) {
        throw new TypeError(`${patchLocation}.metadata.${key} is not supported`)
      }
      if (field === undefined) continue
      const fieldLocation = `${patchLocation}.metadata.${key}`
      if (typeof field === "string") {
        compileSourceTemplate(field, {
          location: fieldLocation,
          slot: "radarMetadata",
        })
      } else {
        validateRadarHtmlField(field, fieldLocation)
      }
    }
  })
}

function validateRadarMatch(match: unknown, location: string): void {
  if (
    !isRecord(match)
    || Object.keys(match).some(key => !["hosts", "location", "paths", "query"].includes(key))
    || !Array.isArray(match.hosts)
    || match.hosts.length === 0
    || match.hosts.some(host => typeof host !== "string" || !host.trim())
  ) {
    throw new TypeError(`${location} must be a structured Radar match`)
  }
  if (
    match.location !== undefined
    && match.location !== "url"
    && match.location !== "hash"
  ) {
    throw new TypeError(`${location}.location must be "url" or "hash"`)
  }
  validateRadarPathPatterns(match.paths, `${location}.paths`)
  validateRadarQueryKeys(match.query, `${location}.query`)
}

function validateRadarPathPatterns(
  paths: unknown,
  location: string,
): void {
  if (paths === undefined) return
  if (Array.isArray(paths)) {
    validateRadarPathPatternList(paths, location)
    return
  }
  if (
    !isRecord(paths)
    || Object.keys(paths).some(key => key !== "include" && key !== "exclude")
  ) {
    throw new TypeError(`${location} must be Radar paths`)
  }
  validateRadarPathPatternList(paths?.include, `${location}.include`)
  validateRadarPathPatternList(paths?.exclude, `${location}.exclude`)
}

function validateRadarPathPatternList(
  patterns: unknown,
  location: string,
): void {
  if (patterns === undefined) return
  if (!Array.isArray(patterns)) {
    throw new TypeError(`${location} must be an array`)
  }
  patterns.forEach((pattern, index) => {
    if (typeof pattern !== "string" || !pattern) {
      throw new TypeError(`${location}.${index} must be a Radar path`)
    }
  })
}

function validateRadarQueryKeys(
  keys: unknown,
  location: string,
): void {
  if (keys === undefined) return
  if (
    !Array.isArray(keys)
    || keys.length === 0
    || keys.some(key => typeof key !== "string" || !key)
    || new Set(keys).size !== keys.length
  ) {
    throw new TypeError(`${location} must be a non-empty array of unique query keys`)
  }
}

function validateRadarHtmlField(
  value: unknown,
  location: string,
): void {
  const allowedProperties = [
    "select",
    "scope",
    "traverse",
    "attr",
    "content",
    "brSeparator",
    "all",
    "separator",
    "template",
  ]
  if (
    !isRecord(value)
    || Object.keys(value).some(property => !allowedProperties.includes(property))
  ) {
    throw new TypeError(`${location} must be an HTML field object`)
  }
  const field = value as HtmlFieldConfig

  const selectors = typeof field.select === "string"
    ? [field.select]
    : field.select
  if (
    selectors !== undefined
    && (
      !Array.isArray(selectors)
      || selectors.length === 0
      || selectors.some(selector =>
        typeof selector !== "string"
        || selector.length > SOURCE_REGISTRY_LIMITS.maxRadarFieldSelectorLength,
      )
    )
  ) {
    throw new TypeError(`${location}.select has an invalid CSS selector`)
  }
  if (field.scope !== undefined && field.scope !== "document" && field.scope !== "item") {
    throw new TypeError(`${location}.scope must be "document" or "item"`)
  }
  validateRadarTraversals(field.traverse, `${location}.traverse`)
  if (
    field.attr !== undefined
    && (
      typeof field.attr !== "string"
      || !field.attr.trim()
      || field.attr.length > SOURCE_REGISTRY_LIMITS.maxRadarFieldAttributeLength
      || !/^[\w:.-]+$/.test(field.attr)
    )
  ) {
    throw new TypeError(`${location}.attr has an invalid attribute name`)
  }
  if (
    field.content !== undefined
    && !["html", "outerHtml", "text"].includes(field.content)
  ) {
    throw new TypeError(`${location}.content has an invalid value`)
  }
  if (field.brSeparator !== undefined && typeof field.brSeparator !== "string") {
    throw new TypeError(`${location}.brSeparator must be a string`)
  }
  if (field.all !== undefined && typeof field.all !== "boolean") {
    throw new TypeError(`${location}.all must be a boolean`)
  }
  if (field.separator !== undefined && typeof field.separator !== "string") {
    throw new TypeError(`${location}.separator must be a string`)
  }
  if (field.template !== undefined) {
    if (typeof field.template !== "string") {
      throw new TypeError(`${location}.template must be a string`)
    }
    compileSourceTemplate(field.template, {
      location: `${location}.template`,
      slot: "field",
    })
  }
}

function validateRadarTraversals(
  traverse: unknown,
  location: string,
): void {
  if (traverse === undefined) return
  const traversals = Array.isArray(traverse) ? traverse : [traverse]
  for (const traversal of traversals) {
    if (!isRecord(traversal) || typeof traversal.type !== "string") {
      throw new TypeError(`${location} has an invalid traversal`)
    }
    const needsSelector = traversal.type === "closest"
    const allowsSelector = ["closest", "next", "previous", "siblings"].includes(traversal.type)
    const selector = traversal.selector
    const properties = Object.keys(traversal)
    if (
      !["closest", "next", "parent", "previous", "siblings"].includes(traversal.type)
      || properties.some(property => !["type", "selector"].includes(property))
      || (needsSelector && typeof selector !== "string")
      || (!allowsSelector && "selector" in traversal)
      || (
        selector !== undefined
        && (
          typeof selector !== "string"
          || selector.length > SOURCE_REGISTRY_LIMITS.maxRadarFieldSelectorLength
        )
      )
    ) {
      throw new TypeError(`${location} has an invalid traversal`)
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}
