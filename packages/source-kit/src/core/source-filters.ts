import { parseRelativeDate } from "@newsnext/date-parser"
import { getFavicon } from "@newsnext/shared/utils"
import { compileSourceRegex, validateSourceRegexInput } from "./regex"

const CACHE_LIMIT = 256
const regexCache = new Map<string, RegExp>()

// Shared by field transforms and the remaining templates; conversions have one implementation.
export const sourceFilters = {
  required: (value: unknown) => {
    if (value === undefined || value === null || value === "") {
      throw new Error("Required template value is missing")
    }
    return value
  },
  absolute_url: (value: unknown, base: unknown) => {
    return resolveUrl(value, base)
  },
  css_url: (value: unknown) => {
    return extractCssUrl(value)
  },
  compact_number: (value: unknown) => {
    const number = Number(value)
    if (!Number.isFinite(number)) return ""
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(number)
  },
  parse_compact_number: (value: unknown) => {
    return parseCompactNumber(value)
  },
  date_to_ms: (value: unknown) => {
    const timestamp = Date.parse(stringify(value))
    return Number.isFinite(timestamp) ? timestamp : undefined
  },
  first_line: (value: unknown) => {
    return firstLine(value)
  },
  favicon_url: (value: unknown) => {
    return getFavicon(stringify(value))
  },
  normalize_lines: (value: unknown, spacing: unknown = 1) => {
    const lineSpacing = Number(spacing)
    if (!Number.isInteger(lineSpacing) || lineSpacing < 1 || lineSpacing > 4) {
      throw new Error("The normalize_lines spacing must be an integer from 1 through 4")
    }
    return normalizeLines(value, "\n".repeat(lineSpacing))
  },
  normalize_whitespace: (value: unknown) => {
    return stringify(value).replace(/\s+/g, " ").trim()
  },
  regex_extract: (value: unknown, pattern: unknown, group: unknown = 1) => {
    const input = getRegexInput(value)
    const match = getRegex(pattern).exec(input)
    if (!match) return ""

    const groupIndex = Number(group)
    if (!Number.isInteger(groupIndex) || groupIndex < 0 || groupIndex > 99) {
      throw new Error("The regex_extract group must be an integer from 0 through 99")
    }
    return match[groupIndex] ?? ""
  },
  regex_replace: (value: unknown, pattern: unknown, replacement: unknown = "") => {
    return getRegexInput(value).replace(getRegex(pattern, true), stringify(replacement))
  },
  relative_date_to_ms: (value: unknown, timezone: unknown = undefined) => {
    const date = parseRelativeDate(
      stringify(value),
      timezone === undefined ? undefined : stringify(timezone),
    )
    const timestamp = date.getTime()
    return Number.isFinite(timestamp) ? timestamp : undefined
  },
  url_path: encodeUrlComponent,
  url_query: encodeUrlComponent,
}

function parseCompactNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined

  const match = stringify(value).trim().match(/^([+-]?(?:\d{1,3}(?:,\d{3})*|\d+)(?:\.\d+)?)\s*([KMBT])?$/i)
  if (!match) return undefined

  const number = Number(match[1]?.replaceAll(",", ""))
  const multiplier = {
    K: 1_000,
    M: 1_000_000,
    B: 1_000_000_000,
    T: 1_000_000_000_000,
  }[match[2]?.toUpperCase() ?? ""] ?? 1
  const result = number * multiplier
  return Number.isFinite(result) ? result : undefined
}

function encodeUrlComponent(value: unknown): string {
  return encodeURIComponent(String(value ?? ""))
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

function normalizeLines(value: unknown, separator: string): string {
  return stringify(value)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .join(separator)
}

function resolveUrl(value: unknown, base: unknown): string | undefined {
  const url = stringify(value)
  if (!url) return undefined

  const baseUrl = stringify(base)
  if (!baseUrl) {
    throw new Error("The absolute_url filter requires a base URL")
  }
  return new URL(url, baseUrl).href
}

function getRegexInput(value: unknown): string {
  const input = stringify(value)
  validateSourceRegexInput(input)
  return input
}

function getRegex(patternValue: unknown, global = false): RegExp {
  const pattern = stringify(patternValue)
  const key = `${global ? "g" : ""}:${pattern}`
  const cached = regexCache.get(key)
  if (cached) return cached

  const regex = compileSourceRegex(pattern, global ? "g" : "")
  setCached(regexCache, key, regex)
  return regex
}

function setCached<T>(cache: Map<string, T>, key: string, value: T): void {
  if (cache.size >= CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value
    if (oldestKey !== undefined) {
      cache.delete(oldestKey)
    }
  }
  cache.set(key, value)
}

function stringify(value: unknown): string {
  return value === undefined || value === null ? "" : String(value)
}
