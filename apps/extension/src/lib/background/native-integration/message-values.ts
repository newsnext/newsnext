import type { WidgetCatalogEntry } from "@newsnext/sdk/models"
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

/** Checks the protocol shape only. The renderer validates Widget manifests and entry URLs again. */
export function parseWidgetCatalog(value: unknown): WidgetCatalogEntry[] {
  if (!Array.isArray(value) || value.some(entry => (
    !isRecord(entry)
    || typeof entry.id !== "string"
    || !entry.id
    || typeof entry.title !== "string"
    || typeof entry.color !== "string"
    || !isPositiveInteger(entry.width)
    || !isPositiveInteger(entry.height)
    || !isPositiveInteger(entry.minWidth)
    || !isPositiveInteger(entry.minHeight)
    || (entry.url !== undefined && typeof entry.url !== "string")
    || typeof entry.dataRevision !== "string"
    || !isStringArray(entry.dataFiles)
    || !Number.isSafeInteger(entry.refreshIntervalMs)
    || Number(entry.refreshIntervalMs) < 0
  ))) {
    throw new Error("The native host returned an invalid Widget catalog")
  }
  return value as WidgetCatalogEntry[]
}

function isPositiveInteger(value: unknown): boolean {
  return Number.isSafeInteger(value) && Number(value) > 0
}

function isStringArray(value: unknown): boolean {
  return Array.isArray(value) && value.every(entry => typeof entry === "string")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}
