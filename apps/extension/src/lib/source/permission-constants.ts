export const OPTIONAL_SOURCE_PERMISSIONS = [
  "bookmarks",
  "cookies",
  "favicon",
  "history",
] as const

export type OptionalSourcePermission = typeof OPTIONAL_SOURCE_PERMISSIONS[number]
