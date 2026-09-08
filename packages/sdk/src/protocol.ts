import type { HistoryTime } from "./types.js"

export const DEFAULT_TIMEOUT_MS = 60_000

export class NewsNextError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = "NewsNextError"
    this.code = code
  }
}

export type Frame = { type: "data", data: unknown } | { type: "end" } | { type: "error", error: { code: string, message: string } }

export function parseFrame(line: string): Frame {
  let value: unknown
  try {
    value = JSON.parse(line)
  } catch {
    throw new NewsNextError("SDK_PROTOCOL_ERROR", "CLI emitted invalid JSON")
  }
  if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1 || !("type" in value)) {
    throw new NewsNextError("SDK_PROTOCOL_ERROR", "Invalid or unsupported CLI protocol frame")
  }
  if (value.type === "end") return { type: "end" }
  if (value.type === "data" && "data" in value) return { type: "data", data: value.data }
  if (value.type === "error" && "error" in value && value.error && typeof value.error === "object"
    && "code" in value.error && typeof value.error.code === "string"
    && "message" in value.error && typeof value.error.message === "string") {
    return { type: "error", error: { code: value.error.code, message: value.error.message } }
  }
  throw new NewsNextError("SDK_PROTOCOL_ERROR", "Invalid CLI protocol frame")
}

/** Date-only strings mean midnight UTC; datetime strings must include an explicit zone. */
export function historyTime(value: HistoryTime): number {
  if (typeof value === "string" && !/^\d+$/.test(value)
    && !/^\d{4}-\d{2}-\d{2}$/.test(value)
    && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new RangeError("History times must be Unix milliseconds, YYYY-MM-DD, or RFC 3339 with a timezone")
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = value.slice(0, 10)
    const midnight = new Date(`${date}T00:00:00Z`)
    if (!Number.isFinite(midnight.getTime()) || midnight.toISOString().slice(0, 10) !== date) {
      throw new RangeError("Invalid calendar date")
    }
  }
  const timestamp = value instanceof Date ? value.getTime() : typeof value === "number" || /^\d+$/.test(value) ? Number(value) : Date.parse(value)
  if (!Number.isSafeInteger(timestamp) || timestamp < 0) throw new RangeError("History time must be a nonnegative safe integer timestamp")
  return timestamp
}

export function timeRange(from?: HistoryTime, to?: HistoryTime): { from?: number, to?: number } {
  const start = from === undefined ? undefined : historyTime(from)
  const end = to === undefined ? undefined : historyTime(to)
  if (start !== undefined && end !== undefined && start > end) throw new RangeError("from must not exceed to")
  return { from: start, to: end }
}
