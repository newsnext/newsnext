import type { SourceParamSchema } from "@newsnext/source-kit/types"

export type SourceParamValues = Record<string, unknown>

export function mergeSourceParamValues(
  current: SourceParamValues | undefined,
  patch: SourceParamValues | undefined,
): SourceParamValues {
  const result: SourceParamValues = {}
  for (const values of [current, patch]) {
    for (const [key, value] of Object.entries(values ?? {})) {
      if (value !== undefined && value !== null) result[key] = value
    }
  }
  return result
}

export function sanitizeSourceParamPatch(
  values: SourceParamValues | undefined,
  params?: Record<string, SourceParamSchema>,
): SourceParamValues {
  if (!params || !values) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(values).filter(([key, value]) =>
      Object.hasOwn(params, key) && value !== undefined && value !== null),
  )
}
