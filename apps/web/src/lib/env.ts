const DEFAULT_DEV_API_BASE_URL = "http://localhost:4000/v1"

const configuredApiBaseUrl =
  globalThis.location.protocol === "chrome-extension:"
    ? import.meta.env.WXT_BASE_URL || import.meta.env.VITE_BASE_URL || DEFAULT_DEV_API_BASE_URL
    : import.meta.env.VITE_BASE_URL || (import.meta.env.DEV ? DEFAULT_DEV_API_BASE_URL : globalThis.location.origin)

export const API_BASE_URL = configuredApiBaseUrl.replace(/\/+$/, "")

const apiBaseUrl = new URL(`${API_BASE_URL}/`, globalThis.location.origin)

export const API_ORIGIN_URL = apiBaseUrl.origin
export const API_BASE_PATH = apiBaseUrl.pathname.replace(/\/+$/, "")

export function getApiUrl(path: string): string {
  return new URL(path.replace(/^\/+/, ""), apiBaseUrl).toString()
}
