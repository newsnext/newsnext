import type { FieldTransform, FieldTransforms } from "@newsnext/sdk/models"
import { fieldTransformsDefinition, firstJsonSchemaIssue } from "@newsnext/sdk/schemas"
import { compileSourceRegex } from "./regex"
import { sourceFilters } from "./source-filters"

export function validateFieldTransforms(value: unknown, location: string): void {
  if (value === undefined) return
  const issue = firstJsonSchemaIssue(fieldTransformsDefinition, value)
  if (issue) throw new TypeError(`Invalid field transform at ${location}: ${issue.message}`)
  for (const step of transformSteps(value as FieldTransforms)) {
    if (typeof step !== "string" && (step.op === "regex_extract" || step.op === "regex_replace")) {
      try {
        compileSourceRegex(step.pattern)
      } catch (error) {
        throw new TypeError(`Invalid field transform at ${location}`, { cause: error })
      }
    }
  }
}

export function applyFieldTransforms(value: unknown, transforms: FieldTransforms | undefined, requestUrl?: string): unknown {
  if (transforms === undefined) return value
  return transformSteps(transforms).reduce((current, step) => applyTransform(current, step, requestUrl), value)
}

function transformSteps(transforms: FieldTransforms): readonly FieldTransform[] {
  return Array.isArray(transforms) ? transforms : [transforms as FieldTransform]
}

function applyTransform(value: unknown, step: FieldTransform, requestUrl: string | undefined): unknown {
  if (typeof step === "string") {
    switch (step) {
      case "absolute_url": return sourceFilters.absolute_url(value, requestUrl)
      case "strip_html": return stripHtml(String(value ?? ""))
      case "seconds_to_ms": {
        if (value === undefined || value === null || value === "") return undefined
        const timestamp = Number(value) * 1000
        return Number.isFinite(timestamp) ? timestamp : undefined
      }
      default: return sourceFilters[step](value)
    }
  }
  switch (step.op) {
    case "normalize_lines": return sourceFilters.normalize_lines(value, step.spacing)
    case "truncate": {
      const text = String(value ?? "")
      const suffix = step.suffix ?? "..."
      return text.length <= step.length ? value : text.substring(0, step.length - suffix.length) + suffix
    }
    case "replace": return String(value ?? "").split(step.search).join(step.replacement)
    case "append": return String(value ?? "") + step.value
    case "regex_extract": return sourceFilters.regex_extract(value, step.pattern, step.group)
    case "regex_replace": return sourceFilters.regex_replace(value, step.pattern, step.replacement)
    case "relative_date_to_ms": return sourceFilters.relative_date_to_ms(value, step.timezone)
  }
}

// Linear scan preserves Liquid's text cleanup semantics, including unclosed markup.
function stripHtml(text: string): string {
  const blocks = new Map([["<script", "</script>"], ["<style", "</style>"], ["<!--", "-->"], ["<", ">"]])
  let result = ""
  let cursor = 0
  while (cursor < text.length) {
    const start = text.indexOf("<", cursor)
    if (start < 0) return result + text.slice(cursor)
    result += text.slice(cursor, start)
    for (const [open, close] of blocks) {
      if (!text.startsWith(open, start)) continue
      const end = text.indexOf(close, start + open.length)
      if (end >= 0) {
        cursor = end + close.length
        break
      }
      blocks.delete(open)
    }
    if (cursor <= start) return result + text.slice(start)
  }
  return result
}
