const DEFAULT_DEV_API_BASE_URL = "http://localhost:4000"
const API_PATH_PREFIX = "/v1"

function cleanBaseUrl(value: string | undefined): string {
  return value?.replace(/\/+$/, "") ?? ""
}

export function resolveApiBaseUrl(configuredBaseUrl: string | undefined, isDev: boolean): string {
  const cleanedBaseUrl = cleanBaseUrl(configuredBaseUrl)

  if (cleanedBaseUrl) {
    return cleanedBaseUrl
  }

  return isDev ? DEFAULT_DEV_API_BASE_URL : ""
}

export function isExtensionOrigin(origin: Location | undefined): boolean {
  return origin?.protocol === "chrome-extension:"
}

export const API_BASE_URL = isExtensionOrigin(globalThis.location)
  ? resolveApiBaseUrl(import.meta.env.WXT_BASE_URL || import.meta.env.VITE_BASE_URL, true)
  : resolveApiBaseUrl(import.meta.env.VITE_BASE_URL, import.meta.env.DEV)

function withApiPathPrefix(path: string): string {
  return `${API_PATH_PREFIX}/${path.replace(/^\/+/, "")}`
}

export function getApiUrl(path: string): string {
  return new URL(withApiPathPrefix(path), API_BASE_URL || window.location.origin).toString()
}
