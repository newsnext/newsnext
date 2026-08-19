import type {
  InferSourceParams,
  InferSourceParamValue,
  SourceParamSchema,
  SourceParamSchemaMap,
} from "../types"

import { SourceParamValueError } from "../types"
import { compileSourceRegex, validateSourceRegexInput } from "./regex"

export type SourceParamValidationResult<TValue>
  = | { valid: true, value: TValue }
    | { error: string, valid: false }

export type SourceParamsValidationResult<TParams extends SourceParamSchemaMap>
  = | {
    errors: Partial<Record<keyof TParams, string>>
    valid: true
    values: Partial<InferSourceParams<TParams>>
  }
  | {
    errors: Partial<Record<keyof TParams, string>>
    valid: false
  }

function trimSourceParamInput(value: unknown): unknown {
  if (typeof value === "string") return value.trim()
  if (Array.isArray(value)) {
    return value.map(item => typeof item === "string" ? item.trim() : item)
  }
  return value
}

function assertSourceParamValue<TParam extends SourceParamSchema>(
  param: TParam,
  value: InferSourceParamValue<TParam>,
): InferSourceParamValue<TParam> {
  if (param.type === "number") {
    const numericValue = value as number
    if (!Number.isFinite(numericValue)) {
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

  if (param.type === "url") {
    let url: URL
    try {
      url = new URL(value as string)
    } catch {
      throw new SourceParamValueError(`Invalid value for '${param.title}': expected an HTTP(S) URL`)
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new SourceParamValueError(`Invalid value for '${param.title}': expected an HTTP(S) URL`)
    }
  }

  if (param.validate) {
    const stringValues: string[] = Array.isArray(value) ? value.map(String) : [String(value)]
    const valuesToValidate = stringValues.filter(item => item !== "")
    if ("format" in param.validate) {
      if (param.validate.format === "digits" && valuesToValidate.some(item => !/^\d+$/.test(item))) {
        throw new SourceParamValueError(`Invalid value for '${param.title}': expected digits`)
      }
    }
    if ("regex" in param.validate) {
      const regex = compileSourceRegex(param.validate.regex)
      const matches = valuesToValidate.every((item) => {
        try {
          validateSourceRegexInput(item)
          return regex.test(item)
        } catch {
          return false
        }
      })
      if (!matches) {
        throw new SourceParamValueError(`Invalid value for '${param.title}'`)
      }
    }
  }

  return value
}

function parseSwitchValue(param: SourceParamSchema, value: unknown): boolean {
  if (value === true || value === "true" || value === "1" || value === 1) return true
  if (value === false || value === "false" || value === "0" || value === 0) return false
  throw new SourceParamValueError(`Invalid value for '${param.title}': expected a switch value`)
}

export function parseSourceParamValue<TParam extends SourceParamSchema>(
  param: TParam,
  value: unknown,
): InferSourceParamValue<TParam> {
  const input = value ?? param.default
  const normalizedInput = trimSourceParamInput(input)
  if (
    param.required
    && (normalizedInput === "" || (Array.isArray(normalizedInput) && normalizedInput.length === 0))
  ) {
    throw new SourceParamValueError(`Invalid value for '${param.title}': expected a non-empty value`)
  }

  switch (param.type) {
    case "number":
      return assertSourceParamValue(param, Number(normalizedInput) as InferSourceParamValue<TParam>)
    case "switch":
      return assertSourceParamValue(
        param,
        parseSwitchValue(param, normalizedInput) as InferSourceParamValue<TParam>,
      )
    case "multiselect":
      return assertSourceParamValue(
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
      return assertSourceParamValue(param, String(normalizedInput) as InferSourceParamValue<TParam>)
    default:
      return assertSourceParamValue(param, normalizedInput as InferSourceParamValue<TParam>)
  }
}

export function validateSourceParamValue<TParam extends SourceParamSchema>(
  param: TParam,
  value: unknown,
): SourceParamValidationResult<InferSourceParamValue<TParam>> {
  try {
    return { valid: true, value: parseSourceParamValue(param, value) }
  } catch (error) {
    if (error instanceof SourceParamValueError) {
      return { error: error.message, valid: false }
    }
    throw error
  }
}

export function validateSourceParamPatch<TParams extends SourceParamSchemaMap>(
  params: TParams | undefined,
  rawValues: Record<string, unknown> = {},
): SourceParamsValidationResult<TParams> {
  if (!params) return { errors: {}, valid: true, values: {} }

  const errors: Partial<Record<keyof TParams, string>> = {}
  const values: Partial<InferSourceParams<TParams>> = {}
  for (const [key, value] of Object.entries(rawValues)) {
    if (!Object.hasOwn(params, key) || value === undefined || value === null) continue
    const result = validateSourceParamValue(params[key] as SourceParamSchema, value)
    if (result.valid) {
      values[key as keyof TParams] = result.value as InferSourceParams<TParams>[keyof TParams]
    } else {
      errors[key as keyof TParams] = result.error
    }
  }

  return Object.keys(errors).length === 0
    ? { errors, valid: true, values }
    : { errors, valid: false }
}

export function validateSourceParamDefinitions(
  params: unknown,
  location: string,
): void {
  if (params === undefined) return
  if (!isRecord(params)) {
    throw new TypeError(`${location} must be a parameter record`)
  }

  for (const [key, value] of Object.entries(params)) {
    const paramLocation = `${location}.${key}`
    if (!key || !isRecord(value) || typeof value.type !== "string" || typeof value.title !== "string") {
      throw new TypeError(`${paramLocation} must be a parameter definition`)
    }
    if (!value.title.trim()) {
      throw new TypeError(`${paramLocation}.title must not be empty`)
    }
    if (value.description !== undefined && typeof value.description !== "string") {
      throw new TypeError(`${paramLocation}.description must be a string`)
    }
    if (value.icon !== undefined && typeof value.icon !== "string") {
      throw new TypeError(`${paramLocation}.icon must be a string`)
    }
    if (value.required !== undefined && typeof value.required !== "boolean") {
      throw new TypeError(`${paramLocation}.required must be a boolean`)
    }
    validateSourceParamRule(value.validate, `${paramLocation}.validate`)
    validateSourceParamDefinitionShape(value, paramLocation)

    try {
      parseSourceParamValue(value as unknown as SourceParamSchema, undefined)
    } catch (error) {
      throw new TypeError(`${paramLocation}.default is invalid`, { cause: error })
    }
  }
}

function validateSourceParamDefinitionShape(
  param: Record<string, unknown>,
  location: string,
): void {
  switch (param.type) {
    case "text":
    case "url":
      if (typeof param.default !== "string") {
        throw new TypeError(`${location}.default must be a string`)
      }
      return
    case "number":
      if (!Number.isFinite(param.default)) {
        throw new TypeError(`${location}.default must be a finite number`)
      }
      if (param.min !== undefined && !Number.isFinite(param.min)) {
        throw new TypeError(`${location}.min must be a finite number`)
      }
      if (param.max !== undefined && !Number.isFinite(param.max)) {
        throw new TypeError(`${location}.max must be a finite number`)
      }
      if (typeof param.min === "number" && typeof param.max === "number" && param.min > param.max) {
        throw new TypeError(`${location}.min must not exceed max`)
      }
      return
    case "switch":
      if (typeof param.default !== "boolean") {
        throw new TypeError(`${location}.default must be a boolean`)
      }
      return
    case "select":
      validateSourceParamOptions(param.values, `${location}.values`)
      if (typeof param.default !== "string") {
        throw new TypeError(`${location}.default must be a string`)
      }
      return
    case "multiselect":
      validateSourceParamOptions(param.values, `${location}.values`)
      if (!Array.isArray(param.default) || param.default.some(value => typeof value !== "string")) {
        throw new TypeError(`${location}.default must be a string array`)
      }
      return
    default:
      throw new TypeError(`${location}.type is invalid`)
  }
}

function validateSourceParamOptions(value: unknown, location: string): void {
  if (
    !Array.isArray(value)
    || value.length === 0
    || value.some(option => (
      !isRecord(option)
      || typeof option.label !== "string"
      || typeof option.value !== "string"
    ))
  ) {
    throw new TypeError(`${location} must be a non-empty option array`)
  }
  const optionValues = value.map(option => (option as { value: string }).value)
  if (new Set(optionValues).size !== optionValues.length) {
    throw new TypeError(`${location} must contain unique values`)
  }
}

function validateSourceParamRule(value: unknown, location: string): void {
  if (value === undefined) return
  if (
    !isRecord(value)
    || Object.keys(value).some(key => key !== "format" && key !== "regex")
    || Number("format" in value) + Number("regex" in value) !== 1
  ) {
    throw new TypeError(`${location} must contain exactly one validation rule`)
  }
  if ("format" in value && value.format === "digits") return
  if ("regex" in value && typeof value.regex === "string") {
    try {
      compileSourceRegex(value.regex)
      return
    } catch (error) {
      throw new TypeError(`${location}.regex is invalid`, { cause: error })
    }
  }
  throw new TypeError(`${location} is invalid`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
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
