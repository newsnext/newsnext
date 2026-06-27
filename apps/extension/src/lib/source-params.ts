import type { SourceParamSchema } from "@newsnext/sources/typings"

export const SOURCE_PARAMS_STORAGE_PREFIX = "newsnext-source-params"

export type SourceParamValues = Record<string, unknown>

export function getSourceParamsStorageKey(instanceId: string): string {
  return `${SOURCE_PARAMS_STORAGE_PREFIX}/${instanceId}`
}

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

export function readStoredSourceParamValues(instanceId: string): SourceParamValues | undefined {
  if (typeof window === "undefined") {
    return undefined
  }

  const stored = window.localStorage.getItem(getSourceParamsStorageKey(instanceId))
  if (!stored) {
    return undefined
  }

  try {
    return JSON.parse(stored) as SourceParamValues
  } catch {
    window.localStorage.removeItem(getSourceParamsStorageKey(instanceId))
    return undefined
  }
}

export function getSavedSourceParamValues(
  instanceId: string,
  params?: Record<string, SourceParamSchema>,
): SourceParamValues {
  return sanitizeSourceParamValues(readStoredSourceParamValues(instanceId), params)
}

export function writeStoredSourceParamValues(instanceId: string, values: SourceParamValues): void {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(getSourceParamsStorageKey(instanceId), JSON.stringify(values))
}

export function deleteStoredSourceParamValues(instanceId: string): void {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(getSourceParamsStorageKey(instanceId))
}
