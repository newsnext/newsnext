import type { Color } from "@newsnext/shared/types"

/**
 * Appearance snapshot for a removed Widget definition: title/color only, so
 * the error placeholder keeps its identity instead of disappearing. Snapshot
 * data must never render once the definition is gone.
 */
export interface WidgetAppearanceSnapshot {
  color: Color
  id: string
  title: string
  updatedAt: number
}

const STORAGE_KEY = "newsnext.widget-appearance-snapshots.v1"
const MAX_ENTRIES = 200

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isColor(value: unknown): value is Color {
  return typeof value === "string" && value.length > 0
}

function isSnapshot(value: unknown): value is WidgetAppearanceSnapshot {
  if (!isRecord(value)) return false
  const candidate = value
  return typeof candidate.id === "string"
    && candidate.id.length > 0
    && typeof candidate.title === "string"
    && candidate.title.length > 0
    && isColor(candidate.color)
    && typeof candidate.updatedAt === "number"
}

export function rememberWidgetAppearances(
  manifests: readonly { color: Color, id: string, title: string }[],
): void {
  if (manifests.length === 0) return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    const record: Record<string, WidgetAppearanceSnapshot> = isRecord(parsed)
      ? Object.fromEntries(
          Object.entries(parsed).filter((entry): entry is [string, WidgetAppearanceSnapshot] => (
            typeof entry[0] === "string" && isSnapshot(entry[1])
          )),
        )
      : {}
    const now = Date.now()
    for (const manifest of manifests) {
      record[manifest.id] = {
        color: manifest.color,
        id: manifest.id,
        title: manifest.title,
        updatedAt: now,
      }
    }
    const entries = Object.values(record).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_ENTRIES)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries.map(entry => [entry.id, entry]))))
  } catch {
    // Appearance cache must never break rendering.
  }
}

export function readWidgetAppearanceSnapshots(): Record<string, WidgetAppearanceSnapshot> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, WidgetAppearanceSnapshot] => (
        typeof entry[0] === "string" && isSnapshot(entry[1])
      )),
    )
  } catch {
    return {}
  }
}
