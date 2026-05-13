function cleanBaseURL(value: string | undefined): string {
  return value?.replace(/\/$/, "") ?? ""
}

function getBaseURL(): string {
  const configuredBaseURL = cleanBaseURL(import.meta.env.VITE_BASE_URL)

  if (configuredBaseURL) {
    return configuredBaseURL
  }

  return ""
}

export const BASE_URL = getBaseURL()

export function getAppURL(path: string): string {
  return new URL(path, BASE_URL || window.location.origin).toString()
}
