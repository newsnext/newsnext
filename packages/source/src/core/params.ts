import type {
  InferSourceParams,
  InferSourceParamValue,
  SourceParamSchema,
  SourceParamSchemaMap,
  SourceTemplateVars,
} from "../types"

import { SourceParamGuards, SourceParamValueError } from "../types"
import {
  compileSourceTemplate,
  createSourceTemplateScope,
} from "./template"

const parameterTemplates = new WeakMap<object, ReturnType<typeof compileSourceTemplate>>()

export function compileSourceParamTemplates(
  params: SourceParamSchemaMap | undefined,
  location: string,
): void {
  for (const [key, param] of Object.entries(params ?? {})) {
    if (!param.template) continue
    parameterTemplates.set(param, compileSourceTemplate(param.template, {
      location: `${location}.${key}.template`,
      slot: "param",
    }))
  }
}

function trimSourceParamInput(value: unknown): unknown {
  if (typeof value === "string") return value.trim()
  if (Array.isArray(value)) {
    return value.map(item => typeof item === "string" ? item.trim() : item)
  }
  return value
}

export function getDefaultValues(params?: Record<string, SourceParamSchema>) {
  return params ? Object.fromEntries(Object.entries(params).map(([key, param]) => [key, param.default])) : {}
}

function validateSourceParamValue<TParam extends SourceParamSchema>(
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

  return value
}

export function parseSourceParamValue<TParam extends SourceParamSchema>(
  param: TParam,
  value: unknown,
  vars: SourceTemplateVars = {},
): InferSourceParamValue<TParam> {
  const input = value === undefined ? param.default : value
  const normalizedInput = trimSourceParamInput(input)
  const templatedInput = param.template
    ? getParameterTemplate(param).render(
        createSourceTemplateScope(vars, { value: normalizedInput }),
      )
    : normalizedInput

  switch (param.type) {
    case "number":
      return validateSourceParamValue(param, Number(templatedInput) as InferSourceParamValue<TParam>)
    case "switch":
      return validateSourceParamValue(
        param,
        (
          templatedInput === true
          || templatedInput === "true"
          || templatedInput === "1"
          || templatedInput === 1
        ) as InferSourceParamValue<TParam>,
      )
    case "multiselect":
      return validateSourceParamValue(
        param,
        (
          Array.isArray(templatedInput)
            ? templatedInput.map(String)
            : String(templatedInput).split(",").map(item => item.trim()).filter(Boolean)
        ) as InferSourceParamValue<TParam>,
      )
    case "text":
    case "url":
    case "select":
      return validateSourceParamValue(param, String(templatedInput) as InferSourceParamValue<TParam>)
    default:
      return validateSourceParamValue(param, templatedInput as InferSourceParamValue<TParam>)
  }
}

function getParameterTemplate(
  param: SourceParamSchema,
): ReturnType<typeof compileSourceTemplate> {
  const cached = parameterTemplates.get(param)
  if (cached) return cached

  const compiled = compileSourceTemplate(param.template ?? "", {
    location: `parameter "${param.title}".template`,
    slot: "param",
  })
  parameterTemplates.set(param, compiled)
  return compiled
}

export function parseSourceParams<TParams extends SourceParamSchemaMap>(
  params: TParams | undefined,
  rawValues: Record<string, unknown> = {},
  vars: SourceTemplateVars = {},
): InferSourceParams<TParams> {
  if (!params) {
    return {} as InferSourceParams<TParams>
  }

  return Object.fromEntries(
    Object.entries(params).map(([key, param]) => [
      key,
      parseSourceParamValue(param, rawValues[key], vars),
    ]),
  ) as InferSourceParams<TParams>
}
