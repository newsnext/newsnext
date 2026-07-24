import type {
  InferSourceParams,
  InferSourceParamValue,
  SourceParamSchema,
  SourceParamSchemaMap,
} from "../typings/sources"

import { SourceParamGuards, SourceParamValueError } from "../typings/sources"

export function normalizeTextParam(value: unknown): string {
  return String(value).trim()
}

export function getDefaultValues(params?: Record<string, SourceParamSchema>) {
  return params ? Object.fromEntries(Object.entries(params).map(([key, param]) => [key, param.default])) : {}
}

function validateParsedSourceParamValue<TParam extends SourceParamSchema>(
  param: TParam,
  value: InferSourceParamValue<TParam>,
): InferSourceParamValue<TParam> {
  const stringValue = String(value)

  if (param.pattern && !(new RegExp(param.pattern).test(stringValue))) {
    throw new SourceParamValueError(param.title, `Invalid value for '${param.title}'`)
  }

  if (param.startsWith && !stringValue.startsWith(param.startsWith)) {
    throw new SourceParamValueError(param.title, `Invalid value for '${param.title}'`)
  }

  if (param.notIn?.some(item => item.toLowerCase() === stringValue.toLowerCase())) {
    throw new SourceParamValueError(param.title, `Invalid value for '${param.title}'`)
  }

  if (SourceParamGuards.isNumber(param)) {
    const numericValue = value as number
    if (Number.isNaN(numericValue)) {
      throw new SourceParamValueError(param.title, `Invalid value for '${param.title}': expected a number`)
    }
    if (param.min !== undefined && numericValue < param.min) {
      throw new SourceParamValueError(param.title, `Invalid value for '${param.title}': expected a number >= ${param.min}`)
    }
    if (param.max !== undefined && numericValue > param.max) {
      throw new SourceParamValueError(param.title, `Invalid value for '${param.title}': expected a number <= ${param.max}`)
    }
  }

  if (SourceParamGuards.isSelect(param)) {
    const allowedValues = new Set(param.values.map(option => option.value))
    if (!allowedValues.has(value as string)) {
      throw new SourceParamValueError(param.title, `Invalid value for '${param.title}'`)
    }
  }

  if (SourceParamGuards.isMultiSelect(param)) {
    const allowedValues = new Set(param.values.map(option => option.value))
    const values = value as string[]
    const invalidValue = values.find(option => !allowedValues.has(option))
    if (invalidValue) {
      throw new SourceParamValueError(param.title, `Invalid value '${invalidValue}' for '${param.title}'`)
    }
  }

  if (param.validate) {
    const validationResult = param.validate(value)
    if (validationResult !== true) {
      throw new SourceParamValueError(
        param.title,
        typeof validationResult === "string"
          ? validationResult
          : `Invalid value for '${param.title}'`,
      )
    }
  }

  return value
}

export function parseSourceParamValue<TParam extends SourceParamSchema>(
  param: TParam,
  value: unknown,
): InferSourceParamValue<TParam> {
  if (value === undefined) {
    const defaultValue = param.parse
      ? param.parse(param.default)
      : param.default

    return validateParsedSourceParamValue(param, defaultValue as InferSourceParamValue<TParam>)
  }

  if (param.parse) {
    return validateParsedSourceParamValue(
      param,
      param.parse(value) as InferSourceParamValue<TParam>,
    )
  }

  switch (param.type) {
    case "number":
      return validateParsedSourceParamValue(param, Number(value) as InferSourceParamValue<TParam>)
    case "switch":
      return validateParsedSourceParamValue(
        param,
        (value === true || value === "true" || value === "1" || value === 1) as InferSourceParamValue<TParam>,
      )
    case "multiselect":
      return validateParsedSourceParamValue(
        param,
        (Array.isArray(value) ? value.map(String) : String(value).split(",").map(item => item.trim()).filter(Boolean)) as InferSourceParamValue<TParam>,
      )
    case "text":
    case "url":
    case "select":
      return validateParsedSourceParamValue(param, String(value) as InferSourceParamValue<TParam>)
    default:
      return validateParsedSourceParamValue(param, value as InferSourceParamValue<TParam>)
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
    Object.entries(params).map(([key, param]) => [key, parseSourceParamValue(param, rawValues[key])]),
  ) as InferSourceParams<TParams>
}
