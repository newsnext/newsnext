import { parseRelativeDate, transformToUTC } from "@newsnext/date-parser"
import { getFavicon } from "@newsnext/shared/utils"
import { compileSourceRegex, validateSourceRegexInput } from "./regex"

const CACHE_LIMIT = 256
const regexCache = new Map<string, RegExp>()

/** Shared conversions for declarative fields and direct, typed use in custom loaders. */
export const fieldTransforms = {
  strip_html: (value: unknown): string => stripHtml(stringify(value)),
  lowercase: (value: unknown): string => stringify(value).toLowerCase(),
  seconds_to_ms: (value: unknown): number | undefined => {
    if (value === undefined || value === null || value === "") return undefined
    const timestamp = Number(value) * 1000
    return Number.isFinite(timestamp) ? timestamp : undefined
  },
  timestamp_precision: (value: unknown, milliseconds: number): number | undefined => {
    if (value === undefined || value === null || value === "") return undefined
    const timestamp = Number(value)
    return Number.isFinite(timestamp) ? Math.floor(timestamp / milliseconds) * milliseconds : undefined
  },
  truncate: <T>(value: T, length: number, suffix = "..."): T | string => {
    const characters = Array.from(stringify(value))
    if (characters.length <= length) return value
    const ending = Array.from(suffix).slice(0, length)
    return characters.slice(0, length - ending.length).join("") + ending.join("")
  },
  replace: (value: unknown, search: string, replacement: string): string => stringify(value).split(search).join(replacement),
  append: (value: unknown, suffix: string): string => stringify(value) + suffix,
  absolute_url: resolveUrl,
  css_url: extractCssUrl,
  parse_compact_number: parseCompactNumber,
  date_to_ms: (value: unknown, options: { format?: string, timezone?: string } = {}): number | undefined => {
    const text = stringify(value)
    const timestamp = options.format || options.timezone
      ? transformToUTC(text, options.format, options.timezone)
      : Date.parse(text)
    return Number.isFinite(timestamp) ? timestamp : undefined
  },
  first_line: firstLine,
  favicon_url: (value: unknown): string => getFavicon(stringify(value)),
  normalize_lines: (value: unknown, spacing: unknown = 1): string => {
    const lineSpacing = Number(spacing)
    if (!Number.isInteger(lineSpacing) || lineSpacing < 1 || lineSpacing > 4) {
      throw new Error("The normalize_lines spacing must be an integer from 1 through 4")
    }
    return normalizeLines(value, "\n".repeat(lineSpacing))
  },
  normalize_whitespace: (value: unknown): string => stringify(value).replace(/\s+/g, " ").trim(),
  regex_extract: (value: unknown, pattern: unknown, group: unknown = 1): string => {
    const input = getRegexInput(value)
    const match = getRegex(pattern).exec(input)
    if (!match) return ""

    const groupIndex = Number(group)
    if (!Number.isInteger(groupIndex) || groupIndex < 0 || groupIndex > 99) {
      throw new Error("The regex_extract group must be an integer from 0 through 99")
    }
    return match[groupIndex] ?? ""
  },
  regex_replace: (value: unknown, pattern: unknown, replacement: unknown = ""): string => getRegexInput(value).replace(getRegex(pattern, true), stringify(replacement)),
  relative_date_to_ms: (value: unknown, timezone: unknown = undefined): number | undefined => {
    const date = parseRelativeDate(
      stringify(value),
      timezone === undefined ? undefined : stringify(timezone),
    )
    const timestamp = date.getTime()
    return Number.isFinite(timestamp) ? timestamp : undefined
  },
}

function parseCompactNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined

  const match = stringify(value).trim().match(/^([+-]?(?:\d{1,3}(?:,\d{3})*|\d+)(?:\.\d+)?)\s*([KMBT千万亿])?$/i)
  if (!match) return undefined

  const number = Number(match[1]?.replaceAll(",", ""))
  const multiplier = {
    千: 1_000,
    万: 10_000,
    亿: 100_000_000,
    K: 1_000,
    M: 1_000_000,
    B: 1_000_000_000,
    T: 1_000_000_000_000,
  }[match[2]?.toUpperCase() ?? ""] ?? 1
  const result = number * multiplier
  return Number.isFinite(result) ? result : undefined
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
    throw new Error("The absolute_url transform requires a base URL")
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

// Linear scan tolerates unclosed markup without a backtracking regular expression.
function stripHtml(text: string): string {
  const blocks = new Map([["<script", "</script>"], ["<style", "</style>"], ["<!--", "-->"], ["<", ">"]])
  let result = ""
  let cursor = 0
  while (cursor < text.length) {
    const start = text.indexOf("<", cursor)
    if (start < 0) return result + text.slice(cursor)
    result += text.slice(cursor, start)
    for (const [open, close] of blocks) {
      if (!text.startsWith(open, start)) continue
      const end = text.indexOf(close, start + open.length)
      if (end >= 0) {
        cursor = end + close.length
        break
      }
      blocks.delete(open)
    }
    if (cursor <= start) return result + text.slice(start)
  }
  return result
}
