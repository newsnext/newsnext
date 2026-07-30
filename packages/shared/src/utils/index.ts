export const DEFAULT_FAVICON_URL_TEMPLATE = "https://icons.folo.is/{hostname}"

export function getFavicon(
  url: string | URL,
  template = DEFAULT_FAVICON_URL_TEMPLATE,
): string {
  try {
    const parsedUrl = new URL(url)
    const resolved = template
      .replaceAll("{hostname}", parsedUrl.hostname)
      .replaceAll("{origin}", encodeURIComponent(parsedUrl.origin))
      .replaceAll("{url}", encodeURIComponent(parsedUrl.href))

    return template.trim() ? new URL(resolved).href : ""
  } catch {
    return ""
  }
}

function sortSerializableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortSerializableValue)
  }

  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sortSerializableValue(item)]),
    )
  }

  return value
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortSerializableValue(value))
}

export function hashString(value: string): string {
  let hash = 0x811C9DC5

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return (hash >>> 0).toString(36)
}
