import type { HtmlFieldConfig, SourceRadarRule } from "../types"
import { SOURCE_REGISTRY_LIMITS } from "./limits"
import { compileSourceTemplate } from "./template"

export function validateRadarRules(
  rules: SourceRadarRule[] | undefined,
  location: string,
): void {
  rules?.forEach((rule, index) => {
    const patchLocation = `${location}.${index}.patch`
    for (const [key, template] of Object.entries(rule.patch?.params ?? {})) {
      compileSourceTemplate(template, {
        location: `${patchLocation}.params.${key}`,
        slot: "radarParams",
      })
    }
    for (const [key, field] of Object.entries(rule.patch?.metadata ?? {})) {
      if (key === "icon") {
        throw new TypeError(
          `Radar cannot modify ${patchLocation}.metadata.icon; use metadata.badge for dynamic images`,
        )
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
