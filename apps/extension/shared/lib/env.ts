const DEFAULT_EXTENSION_BASE_URL = "http://localhost:4000"

function cleanBaseURL(value: string | undefined): string {
  return value?.replace(/\/$/, "") ?? ""
}

function getBaseURL(): string {
  const configuredBaseURL = cleanBaseURL(import.meta.env.WXT_BASE_URL || import.meta.env.VITE_BASE_URL)

  if (configuredBaseURL) {
    return configuredBaseURL
  }

  if (globalThis.location?.protocol === "chrome-extension:") {
    return DEFAULT_EXTENSION_BASE_URL
  }

  return ""
}

export const BASE_URL = getBaseURL()

export function getAppURL(path: string): string {
  return new URL(path, BASE_URL || window.location.origin).toString()
}
