import type { Color } from "@newsnext/shared/types"
import { isThemeColor } from "@/lib/settings/theme-color"

export type WidgetUi
  = | { type: "custom" }
    | { type: "live-card", query: string, presentation?: "ranking" | "list" }

export interface LocalWidgetManifest {
  color: Color
  height: number
  id: string
  minHeight: number
  minWidth: number
  title: string
  url?: string
  view: WidgetUi
  dataRevision: string
  staleTimeMs: number
  refreshIntervalMs: number
  dataFiles: string[]
  width: number
}

export function parseLocalWidgetManifests(
  value: unknown,
  serverOrigin: string,
): LocalWidgetManifest[] {
  if (!Array.isArray(value)) throw new Error("The widget server returned an invalid manifest list")
  const expectedOrigin = new URL(serverOrigin).origin
  const ids = new Set<string>()
  return value.map((candidate) => {
    if (!isRecord(candidate)
      || (candidate.color !== undefined && !isThemeColor(candidate.color))
      || !isIdentifier(candidate.id)
      || !isNonEmptyString(candidate.title)
      || !isGridSize(candidate.width, 12)
      || !isGridSize(candidate.minWidth, candidate.width)
      || !isGridSize(candidate.height, 100)
      || !isGridSize(candidate.minHeight, candidate.height)) {
      throw new Error("The widget server returned an invalid widget manifest")
    }
    if (ids.has(candidate.id)) throw new Error(`Duplicate widget ID '${candidate.id}'`)
    ids.add(candidate.id)
    const ui = parseWidgetUi(candidate.view)
    let url: URL | undefined
    if (ui.type === "custom") {
      if (typeof candidate.url !== "string") throw new Error("Custom Widget UI requires an entry URL")
      url = new URL(candidate.url)
      if (url.origin !== expectedOrigin || !url.pathname.startsWith(`/widgets/${candidate.id}/`)) {
        throw new Error(`Widget '${candidate.id}' has an invalid entry URL`)
      }
    } else if (candidate.url !== undefined) {
      throw new Error("Built-in Widget UI must not declare an entry URL")
    }
    const refreshIntervalMs = candidate.refreshIntervalMs ?? 300_000
    if (!Number.isSafeInteger(refreshIntervalMs) || Number(refreshIntervalMs) < 60_000) {
      throw new Error("Invalid Widget refresh interval")
    }
    const dataRevision = candidate.dataRevision ?? "legacy"
    const staleTimeMs = candidate.staleTimeMs ?? 120_000
    if (typeof dataRevision !== "string" || !Number.isSafeInteger(staleTimeMs) || Number(staleTimeMs) < 0) throw new Error("Invalid Widget data cache policy")
    const dataFiles = candidate.dataFiles ?? []
    if (!Array.isArray(dataFiles) || !dataFiles.every(isNonEmptyString)) throw new Error("Invalid Widget data files")
    return {
      dataFiles,
      dataRevision,
      staleTimeMs: Number(staleTimeMs),
      color: candidate.color ?? "slate",
      height: candidate.height,
      id: candidate.id,
      minHeight: candidate.minHeight,
      minWidth: candidate.minWidth,
      title: candidate.title,
      url: url?.href,
      view: ui,
      refreshIntervalMs: Number(refreshIntervalMs),
      width: candidate.width,
    }
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function isIdentifier(value: unknown): value is string {
  return typeof value === "string" && /^[\w-]+$/.test(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isGridSize(value: unknown, maximum: number): value is number {
  return Number.isInteger(value) && Number(value) > 0 && Number(value) <= maximum
}

export function parseWidgetUi(value: unknown): WidgetUi {
  if (value === undefined) return { type: "custom" }
  if (isRecord(value) && value.type === "custom") return { type: "custom" }
  if (isRecord(value) && value.type === "live-card" && isIdentifier(value.query)
    && (value.presentation === undefined || value.presentation === "ranking" || value.presentation === "list")) {
    return {
      type: "live-card",
      query: value.query,
      ...(value.presentation === undefined ? {} : { presentation: value.presentation }),
    }
  }
  throw new Error("Invalid Widget UI")
}
