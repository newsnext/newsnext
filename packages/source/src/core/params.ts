import type {
  InferSourceParams,
  InferSourceParamValue,
  SourceParamSchema,
  SourceParamSchemaMap,
} from "../types"

import { SourceParamValueError } from "../types"

function trimSourceParamInput(value: unknown): unknown {
  if (typeof value === "string") return value.trim()
  if (Array.isArray(value)) {
    return value.map(item => typeof item === "string" ? item.trim() : item)
  }
  return value
}

function validateSourceParamValue<TParam extends SourceParamSchema>(
  param: TParam,
  value: InferSourceParamValue<TParam>,
): InferSourceParamValue<TParam> {
  if (param.type === "number") {
    const numericValue = value as number
    if (Number.isNaN(numericValue)) {
      throw new SourceParamValueError(`Invalid value for '${param.title}': expected a number`)
    }
    if (param.min !== undefined && numericValue < param.min) {
      throw new SourceParamValueError(`Invalid value for '${param.title}': expected a number >= ${param.min}`)
    }
    if (param.max !== undefined && numericValue > param.max) {
      throw new SourceParamValueError(`Invalid value for '${param.title}': expected a number <= ${param.max}`)
    }
  }

  if (param.type === "select") {
    const allowedValues = new Set(param.values.map(option => option.value))
    if (!allowedValues.has(value as string)) {
      throw new SourceParamValueError(`Invalid value for '${param.title}'`)
    }
  }

  if (param.type === "multiselect") {
    const allowedValues = new Set(param.values.map(option => option.value))
    const values = value as string[]
    const invalidValue = values.find(option => !allowedValues.has(option))
    if (invalidValue) {
      throw new SourceParamValueError(`Invalid value '${invalidValue}' for '${param.title}'`)
    }
  }

  return value
}

export function parseSourceParamValue<TParam extends SourceParamSchema>(
  param: TParam,
  value: unknown,
): InferSourceParamValue<TParam> {
  const input = value === undefined ? param.default : value
  const normalizedInput = trimSourceParamInput(input)

  switch (param.type) {
    case "number":
      return validateSourceParamValue(param, Number(normalizedInput) as InferSourceParamValue<TParam>)
    case "switch":
      return validateSourceParamValue(
        param,
        (
          normalizedInput === true
          || normalizedInput === "true"
          || normalizedInput === "1"
          || normalizedInput === 1
        ) as InferSourceParamValue<TParam>,
      )
    case "multiselect":
      return validateSourceParamValue(
        param,
        (
          Array.isArray(normalizedInput)
            ? normalizedInput.map(String)
            : String(normalizedInput).split(",").map(item => item.trim()).filter(Boolean)
        ) as InferSourceParamValue<TParam>,
      )
    case "text":
    case "url":
    case "select":
      return validateSourceParamValue(param, String(normalizedInput) as InferSourceParamValue<TParam>)
    default:
      return validateSourceParamValue(param, normalizedInput as InferSourceParamValue<TParam>)
  }
}

export function parseSourceParams<TParams extends SourceParamSchemaMap>(
  params: TParams | undefined,
  rawValues: Record<string, unknown> = {},
): InferSourceParams<TParams> {
  if (!params) {
    return {} as InferSourceParams<TParams>
  }

  return Object.fromEntries(
    Object.entries(params).map(([key, param]) => [
      key,
      parseSourceParamValue(param, rawValues[key]),
    ]),
  ) as InferSourceParams<TParams>
}
