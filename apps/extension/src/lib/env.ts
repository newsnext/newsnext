const DEFAULT_API_BASE_URL = import.meta.env.DEV
  ? "http://localhost:4000/v1"
  : "https://api.newsnext.pro/v1"

const configuredApiBaseUrl
  = import.meta.env.WXT_BASE_URL || import.meta.env.VITE_BASE_URL || DEFAULT_API_BASE_URL

export const API_BASE_URL = configuredApiBaseUrl.replace(/\/+$/, "")

const apiBaseUrl = new URL(`${API_BASE_URL}/`, globalThis.location.origin)

export function getApiUrl(path: string): string {
  return new URL(path.replace(/^\/+/, ""), apiBaseUrl).toString()
}
