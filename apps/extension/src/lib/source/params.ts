import type { SourceParamSchema } from "@newsnext/source/types"

export type SourceParamValues = Record<string, unknown>

export function sanitizeSourceParamPatch(
  values: SourceParamValues | undefined,
  params?: Record<string, SourceParamSchema>,
): SourceParamValues {
  if (!params || !values) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(values).filter(([key, value]) =>
      Object.hasOwn(params, key) && value !== undefined),
  )
}
