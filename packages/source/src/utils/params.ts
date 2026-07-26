import type {
  InferSourceParams,
  InferSourceParamValue,
  SourceParamSchema,
  SourceParamSchemaMap,
  SourceParamTransform,
} from "../typings/sources"

import { SourceParamGuards, SourceParamValueError } from "../typings/sources"

const MAX_PARAM_VALUE_LENGTH = 20_000
const MAX_REPLACEMENT_LENGTH = 256

export function applySourceParamTransforms(
  value: unknown,
  transforms: readonly SourceParamTransform[] = [],
): string {
  if (transforms.length > 8) {
    throw new Error("A source parameter cannot use more than 8 transforms")
  }

  const input = String(value)
  assertParamValueLength(input)

  return transforms.reduce((current, transform) => {
    let transformed: string
    switch (transform.type) {
      case "lowercase":
        transformed = current.toLowerCase()
        break
      case "normalizeWhitespace":
        transformed = current.replace(/\s+/g, " ").trim()
        break
      case "removePrefix":
        transformed = current.startsWith(transform.value)
          ? current.slice(transform.value.length)
          : current
        break
      case "removeSuffix":
        transformed = current.endsWith(transform.value)
          ? current.slice(0, current.length - transform.value.length)
          : current
        break
      case "replace":
        transformed = replaceLiteral(current, transform)
        break
      case "trim":
        transformed = current.trim()
        break
      case "uppercase":
        transformed = current.toUpperCase()
        break
      default:
        throw new Error(`Unsupported source parameter transform: ${(transform as { type?: unknown }).type}`)
    }

    assertParamValueLength(transformed)
    return transformed
  }, input)
}

function replaceLiteral(
  input: string,
  transform: Extract<SourceParamTransform, { type: "replace" }>,
): string {
  const { search, replacement, all = true } = transform
  assertReplacement(replacement)
  if (!search) {
    throw new Error("The replace parameter transform requires a non-empty search value")
  }

  if (!all) {
    const index = input.indexOf(search)
    return index === -1
      ? input
      : `${input.slice(0, index)}${replacement}${input.slice(index + search.length)}`
  }

  const parts: string[] = []
  let start = 0
  while (start < input.length) {
    const index = input.indexOf(search, start)
    if (index === -1) break
    parts.push(input.slice(start, index), replacement)
    start = index + search.length
  }
  parts.push(input.slice(start))
  return parts.join("")
}

function assertReplacement(replacement: string): void {
  if (replacement.length > MAX_REPLACEMENT_LENGTH) {
    throw new Error(
      `A source parameter replacement cannot exceed ${MAX_REPLACEMENT_LENGTH} characters`,
    )
  }
}

function assertParamValueLength(value: string): void {
  if (value.length > MAX_PARAM_VALUE_LENGTH) {
    throw new Error(
      `A transformed source parameter cannot exceed ${MAX_PARAM_VALUE_LENGTH} characters`,
    )
  }
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
  const input = value === undefined ? param.default : value
  const transformedInput = "transforms" in param && param.transforms
    ? applySourceParamTransforms(input, param.transforms)
    : input

  if (param.parse) {
    return validateParsedSourceParamValue(
      param,
      param.parse(transformedInput) as InferSourceParamValue<TParam>,
    )
  }

  switch (param.type) {
    case "number":
      return validateParsedSourceParamValue(param, Number(transformedInput) as InferSourceParamValue<TParam>)
    case "switch":
      return validateParsedSourceParamValue(
        param,
        (
          transformedInput === true
          || transformedInput === "true"
          || transformedInput === "1"
          || transformedInput === 1
        ) as InferSourceParamValue<TParam>,
      )
    case "multiselect":
      return validateParsedSourceParamValue(
        param,
        (
          Array.isArray(transformedInput)
            ? transformedInput.map(String)
            : String(transformedInput).split(",").map(item => item.trim()).filter(Boolean)
        ) as InferSourceParamValue<TParam>,
      )
    case "text":
    case "url":
    case "select":
      return validateParsedSourceParamValue(param, String(transformedInput) as InferSourceParamValue<TParam>)
    default:
      return validateParsedSourceParamValue(param, transformedInput as InferSourceParamValue<TParam>)
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
