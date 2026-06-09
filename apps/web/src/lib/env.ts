const DEFAULT_DEV_API_BASE_URL = "http://localhost:4000"

function cleanBaseURL(value: string | undefined): string {
  return value?.replace(/\/$/, "") ?? ""
}

export function resolveBaseURL(configuredBaseURL: string | undefined, isDEV: boolean): string {
  const cleanedBaseURL = cleanBaseURL(configuredBaseURL)

  if (cleanedBaseURL) {
    return cleanedBaseURL
  }

  return isDEV ? DEFAULT_DEV_API_BASE_URL : ""
}

export const BASE_URL = resolveBaseURL(import.meta.env.VITE_BASE_URL, import.meta.env.DEV)

export function getAppURL(path: string): string {
  return new URL(path, BASE_URL || window.location.origin).toString()
}
