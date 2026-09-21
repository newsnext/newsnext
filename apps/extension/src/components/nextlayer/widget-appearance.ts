import type { Color } from "@newsnext/shared/types"
import type { WidgetUi } from "./widget-manifest"

/**
 * Appearance (+view) snapshot for a removed Widget definition.
 * `dataRevision`/`viewRevision` are the definition version identity: cached
 * data renders only on an exact `dataRevision` match, and a live manifest
 * (present in the catalog) always wins as newest by construction.
 */
export interface WidgetAppearanceSnapshot {
  color: Color
  dataRevision: string
  id: string
  title: string
  updatedAt: number
  view: WidgetUi
  viewRevision: string
}

const STORAGE_KEY = "newsnext.widget-appearance-snapshots.v1"
const MAX_ENTRIES = 200

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isColor(value: unknown): value is Color {
  return typeof value === "string" && value.length > 0
}

function isWidgetUi(value: unknown): value is WidgetUi {
  return isRecord(value) && (value.type === "chart" || value.type === "custom" || value.type === "live-card")
}

function isSnapshot(value: unknown): value is WidgetAppearanceSnapshot {
  if (!isRecord(value)) return false
  const candidate = value
  return typeof candidate.id === "string"
    && candidate.id.length > 0
    && typeof candidate.title === "string"
    && candidate.title.length > 0
    && isColor(candidate.color)
    && typeof candidate.dataRevision === "string"
    && typeof candidate.viewRevision === "string"
    && isWidgetUi(candidate.view)
    && typeof candidate.updatedAt === "number"
}

export function rememberWidgetAppearances(
  manifests: readonly { color: Color, dataRevision: string, id: string, title: string, view: WidgetUi, viewRevision: string }[],
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
        dataRevision: manifest.dataRevision,
        id: manifest.id,
        title: manifest.title,
        updatedAt: now,
        view: manifest.view,
        viewRevision: manifest.viewRevision,
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
