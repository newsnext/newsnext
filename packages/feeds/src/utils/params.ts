import type {
  FeedParamSchema,
  FeedParamSchemaMap,
  InferFeedParams,
  InferFeedParamValue,
  MultiSelectParameter,
  NumberParameter,
  SelectParameter,
  SwitchParameter,
  TextParameter,
  UrlParameter,
} from "../typings/feeds"

import { FeedParamGuards, FeedParamValueError } from "../typings/feeds"

export function getDefaultValues(params?: Record<string, FeedParamSchema>) {
  return params ? Object.fromEntries(Object.entries(params).map(([key, param]) => [key, param.default])) : {}
}

function validateParsedFeedParamValue<TParam extends FeedParamSchema>(
  param: TParam,
  value: InferFeedParamValue<TParam>,
): InferFeedParamValue<TParam> {
  if (FeedParamGuards.isNumber(param)) {
    const numericValue = value as number
    if (Number.isNaN(numericValue)) {
      throw new FeedParamValueError(param.title, `Invalid value for '${param.title}': expected a number`)
    }
    if (param.min !== undefined && numericValue < param.min) {
      throw new FeedParamValueError(param.title, `Invalid value for '${param.title}': expected a number >= ${param.min}`)
    }
    if (param.max !== undefined && numericValue > param.max) {
      throw new FeedParamValueError(param.title, `Invalid value for '${param.title}': expected a number <= ${param.max}`)
    }
  }

  if (FeedParamGuards.isSelect(param)) {
    const allowedValues = new Set(param.options.map(option => option.value))
    if (!allowedValues.has(value as string)) {
      throw new FeedParamValueError(param.title, `Invalid value for '${param.title}'`)
    }
  }

  if (FeedParamGuards.isMultiSelect(param)) {
    const allowedValues = new Set(param.options.map(option => option.value))
    const values = value as string[]
    const invalidValue = values.find(option => !allowedValues.has(option))
    if (invalidValue) {
      throw new FeedParamValueError(param.title, `Invalid value '${invalidValue}' for '${param.title}'`)
    }
  }

  if (param.validate) {
    const validationResult = param.validate(value)
    if (validationResult !== true) {
      throw new FeedParamValueError(
        param.title,
        typeof validationResult === "string"
          ? validationResult
          : `Invalid value for '${param.title}'`,
      )
    }
  }

  return value
}

export function parseFeedParamValue<TParam extends FeedParamSchema>(
  param: TParam,
  value: unknown,
): InferFeedParamValue<TParam> {
  if (value === undefined) {
    const defaultValue = param.parse
      ? param.parse(param.default)
      : param.default

    return validateParsedFeedParamValue(param, defaultValue as InferFeedParamValue<TParam>)
  }

  if (param.parse) {
    return validateParsedFeedParamValue(
      param,
      param.parse(value) as InferFeedParamValue<TParam>,
    )
  }

  switch (param.type) {
    case "number":
      return validateParsedFeedParamValue(param, Number(value) as InferFeedParamValue<TParam>)
    case "switch":
      return validateParsedFeedParamValue(
        param,
        (value === true || value === "true" || value === "1" || value === 1) as InferFeedParamValue<TParam>,
      )
    case "multiselect":
      return validateParsedFeedParamValue(
        param,
        (Array.isArray(value) ? value.map(String) : String(value).split(",").map(item => item.trim()).filter(Boolean)) as InferFeedParamValue<TParam>,
      )
    case "text":
    case "url":
    case "select":
      return validateParsedFeedParamValue(param, String(value) as InferFeedParamValue<TParam>)
    default:
      return validateParsedFeedParamValue(param, value as InferFeedParamValue<TParam>)
  }
}

export function parseFeedParams<TParams extends FeedParamSchemaMap>(
  params: TParams | undefined,
  rawValues: Record<string, unknown> = {},
): InferFeedParams<TParams> {
  if (!params) {
    return {} as InferFeedParams<TParams>
  }

  return Object.fromEntries(
    Object.entries(params).map(([key, param]) => [key, parseFeedParamValue(param, rawValues[key])]),
  ) as InferFeedParams<TParams>
}

export function $selectParam<K extends string>(R: Omit<SelectParameter<K>, "type">): SelectParameter<K> {
  return {
    type: "select",
    ...R,
  }
}

export function $textParam<TOutput = string>(
  R: Omit<TextParameter<TOutput>, "type">,
): TextParameter<TOutput> {
  return {
    type: "text",
    ...R,
  }
}

export function $urlParam<TOutput = string>(
  R: Omit<UrlParameter<TOutput>, "type">,
): UrlParameter<TOutput> {
  return {
    type: "url",
    ...R,
  }
}

export function $numberParam<TOutput = number>(
  R: Omit<NumberParameter<TOutput>, "type">,
): NumberParameter<TOutput> {
  return {
    type: "number",
    ...R,
  }
}

export function $switchParam<TOutput = boolean>(
  R: Omit<SwitchParameter<TOutput>, "type">,
): SwitchParameter<TOutput> {
  return {
    type: "switch",
    ...R,
  }
}

export function $multiSelectParam<K extends string>(R: Omit<MultiSelectParameter<K>, "type">): MultiSelectParameter<K> {
  return {
    type: "multiselect",
    ...R,
  }
}

export function $jsonParam<TOutput>(
  config: Omit<TextParameter<TOutput>, "type">,
): TextParameter<TOutput> {
  return $textParam<TOutput>({
    ...config,
    parse: (value) => {
      if (typeof value !== "string") {
        throw new FeedParamValueError(config.title, `${config.title} must be a JSON string`)
      }

      try {
        return JSON.parse(value) as TOutput
      } catch {
        throw new FeedParamValueError(config.title, `${config.title} must be valid JSON`)
      }
    },
  })
}

export const CommonFeedParams = {
  type: $selectParam<"hottest" | "timeline">({
    options: [
      { label: "Hottest", value: "hottest" },
      { label: "Timeline", value: "timeline" },
    ],
    default: "timeline",
    title: "Type",
  }),
}
