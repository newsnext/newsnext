import type { FieldTransform, FieldTransforms } from "../../models/index.js"
import { fieldTransformsDefinition, firstJsonSchemaIssue } from "../../schemas/index.js"
import { fieldTransforms } from "./field-conversions"
import { compileSourceRegex } from "./regex"

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
    return step === "absolute_url" ? fieldTransforms.absolute_url(value, requestUrl) : fieldTransforms[step](value)
  }
  switch (step.op) {
    case "date_to_ms": return fieldTransforms.date_to_ms(value, step)
    case "timestamp_precision": return fieldTransforms.timestamp_precision(value, step.milliseconds)
    case "normalize_lines": return fieldTransforms.normalize_lines(value, step.spacing)
    case "truncate": return fieldTransforms.truncate(value, step.length, step.suffix)
    case "replace": return fieldTransforms.replace(value, step.search, step.replacement)
    case "append": return fieldTransforms.append(value, step.value)
    case "regex_extract": return fieldTransforms.regex_extract(value, step.pattern, step.group)
    case "regex_replace": return fieldTransforms.regex_replace(value, step.pattern, step.replacement)
    case "relative_date_to_ms": return fieldTransforms.relative_date_to_ms(value, step.timezone)
  }
}
