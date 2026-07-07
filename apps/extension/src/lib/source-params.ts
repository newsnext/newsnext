import type { SourceParamSchema } from "@newsnext/client-source/typings"

const SOURCE_PARAMS_STORAGE_PREFIX = "newsnext-source-params"

export type SourceParamValues = Record<string, unknown>

export function getDefaultSourceParamValues(params?: Record<string, SourceParamSchema>): SourceParamValues {
  if (!params) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(params).map(([key, param]) => [key, param.default]),
  )
}

export function sanitizeSourceParamValues(
  values: SourceParamValues | undefined,
  params?: Record<string, SourceParamSchema>,
): SourceParamValues {
  const defaults = getDefaultSourceParamValues(params)

  if (!params) {
    return {}
  }

  if (!values) {
    return defaults
  }

  return Object.fromEntries(
    Object.keys(params).map(key => [key, values[key] ?? defaults[key]]),
  )
}

export function clearStoredSourceParamValues(): void {
  if (typeof window === "undefined") {
    return
  }

  const keys = Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
    .filter((key): key is string => Boolean(key?.startsWith(`${SOURCE_PARAMS_STORAGE_PREFIX}/`)))

  keys.forEach(key => window.localStorage.removeItem(key))
}
