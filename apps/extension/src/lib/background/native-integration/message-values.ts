import type { LogEntry as NativeLogEntry } from "@/lib/native-protocol/LogEntry"

export function parseLocalCardIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.some(id => typeof id !== "string" || !id)) {
    throw new Error("The native host returned invalid local LiveCard IDs")
  }
  return [...new Set(value)]
}

export function parseRevision(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new Error(`The native host returned an invalid ${label} revision`)
  }
  return Number(value)
}

export function parseLogs(value: unknown): NativeLogEntry[] {
  if (!Array.isArray(value) || value.some(entry => (
    !isRecord(entry)
    || !Number.isSafeInteger(entry.id)
    || typeof entry.timestamp !== "string"
    || !["error", "warn", "info"].includes(String(entry.level))
    || typeof entry.target !== "string"
    || typeof entry.message !== "string"
  ))) {
    throw new Error("The native host returned invalid logs")
  }
  return value as NativeLogEntry[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}
