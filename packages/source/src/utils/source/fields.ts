export type SourceFieldTransform
  = { type: "append", value: string }
    | { type: "extractCssUrl" }
    | { type: "firstLine" }
    | { type: "lowercase" }
    | { type: "multiply", value: number }
    | { type: "normalizeLines", separator?: string }
    | { type: "normalizeWhitespace" }
    | { type: "parseDate" }
    | { type: "prepend", value: string }
    | { type: "resolveUrl", base?: string }
    | { type: "trim" }
    | { type: "truncate", length: number, omission?: string }
    | { type: "uppercase" }

export interface SourceFieldTransformContext {
  requestUrl?: string
}

export function applyFieldTransforms(
  input: unknown,
  transforms: readonly SourceFieldTransform[] = [],
  context: SourceFieldTransformContext = {},
): unknown {
  if (transforms.length > 16) {
    throw new Error("A field cannot use more than 16 transforms")
  }

  return transforms.reduce<unknown>((value, transform) => {
    switch (transform.type) {
      case "append":
        return `${stringify(value)}${transform.value}`
      case "extractCssUrl":
        return extractCssUrl(value)
      case "firstLine":
        return firstLine(value)
      case "lowercase":
        return stringify(value).toLowerCase()
      case "multiply":
        if (!Number.isFinite(transform.value)) {
          throw new TypeError("The multiply transform requires a finite value")
        }
        return multiply(value, transform.value)
      case "normalizeWhitespace":
        return stringify(value).replace(/\s+/g, " ").trim()
      case "normalizeLines":
        return normalizeLines(value, transform.separator)
      case "parseDate": {
        const timestamp = Date.parse(stringify(value))
        return Number.isFinite(timestamp) ? timestamp : undefined
      }
      case "prepend":
        return `${transform.value}${stringify(value)}`
      case "resolveUrl":
        return resolveUrl(value, transform.base ?? context.requestUrl)
      case "trim":
        return stringify(value).trim()
      case "truncate":
        return truncate(value, transform.length, transform.omission)
      case "uppercase":
        return stringify(value).toUpperCase()
      default:
        throw new Error(`Unsupported field transform: ${(transform as { type?: unknown }).type}`)
    }
  }, input)
}

export function normalizeTimestamp(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined
  }

  const timestamp = typeof value === "number" ? value : Number(value)
  return Number.isFinite(timestamp) ? timestamp : undefined
}

function stringify(value: unknown): string {
  return value === undefined || value === null ? "" : String(value)
}

function multiply(value: unknown, multiplier: number): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined
  }
  const number = typeof value === "number" ? value : Number(value)
  return Number.isFinite(number) ? number * multiplier : undefined
}

function extractCssUrl(value: unknown): string | undefined {
  const css = stringify(value)
  const start = css.toLowerCase().indexOf("url(")
  if (start === -1) return undefined

  const content = css.slice(start + 4).trimStart()
  const quote = content[0]
  if (quote === "\"" || quote === "'") {
    const end = content.indexOf(quote, 1)
    return end === -1 ? undefined : content.slice(1, end) || undefined
  }

  const end = content.indexOf(")")
  return end === -1 ? undefined : content.slice(0, end).trim() || undefined
}

function firstLine(value: unknown): string | undefined {
  return stringify(value)
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(Boolean)
}

function normalizeLines(value: unknown, separator = "\n"): string {
  return stringify(value)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .join(separator)
}

function resolveUrl(value: unknown, base: string | undefined): string | undefined {
  const url = stringify(value)
  if (!url) return undefined
  if (!base) {
    throw new Error("The resolveUrl transform requires a base URL or loader request URL")
  }

  return new URL(url, base).href
}

function truncate(
  value: unknown,
  length: number,
  omission = "…",
): string {
  if (!Number.isInteger(length) || length < 1 || length > 10_000) {
    throw new TypeError("The truncate transform length must be an integer between 1 and 10000")
  }

  const characters = Array.from(stringify(value))
  if (characters.length <= length) return characters.join("")

  const omissionCharacters = Array.from(omission)
  const contentLength = Math.max(0, length - omissionCharacters.length)
  return `${characters.slice(0, contentLength).join("").trimEnd()}${omissionCharacters.slice(0, length).join("")}`
}
