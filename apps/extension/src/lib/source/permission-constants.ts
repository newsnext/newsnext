export const OPTIONAL_SOURCE_PERMISSIONS = [
  "cookies",
] as const

export type OptionalSourcePermission = typeof OPTIONAL_SOURCE_PERMISSIONS[number]
