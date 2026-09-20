import type { WidgetChartView } from "@newsnext/sdk/models"
import type { Color } from "@newsnext/shared/types"
import type { SourceParamSchemaMap } from "@newsnext/source-kit/types"
import { isThemeColor, parseWidgetChartView } from "@newsnext/sdk/models"
import { validateSourceParamDefinitions } from "@newsnext/source-kit/core"

/** Widget view selector. `view` omitted means custom when `index.html` exists, else data-only. */
export type WidgetUi
  = | WidgetChartView
    | { type: "custom" }
    /** Built-in LiveCard UI; `query` names the manifest query holding NewsItems. Omit `presentation` for auto timeline/list. */
    | { type: "live-card", query: string, presentation?: "ranking" | "list" }

/** Validated Widget definition from the daemon catalog. Directory name is the Widget ID. */
export interface LocalWidgetManifest {
  /** Optional placement-scoped settings; same param schema as Sources. */
  params?: SourceParamSchemaMap
  /** Named palette color; `slate` when omitted. */
  color: Color
  /** False when no queries and no `data.mjs`; the shell hides refresh. */
  hasData: boolean
  /** Footprint in half-LiveCard grid units (width 1–4, defaults 2). */
  height: number
  id: string
  minHeight: number
  minWidth: number
  title: string
  /** Entry document URL; only custom views declare one. */
  url?: string
  view: WidgetUi
  /** Data-pipeline fingerprint; view fingerprint remounts the placed frame. */
  dataRevision: string
  viewRevision: string
  /** Visible polling interval; default 300s, minimum 60s. No background schedule. */
  refreshIntervalMs: number
  dataFiles: string[]
  width: number
}

/** The catalog the daemon publishes, or the reason its definitions cannot be rendered. */
export interface WidgetCatalog {
  error?: string
  widgets: LocalWidgetManifest[]
}

/** Validates the catalog the daemon pushes over the native protocol. */
export function parseWidgetCatalog(
  value: unknown,
  serverOrigin: string | undefined,
): LocalWidgetManifest[] {
  if (!serverOrigin) return []
  if (!Array.isArray(value)) throw new Error("The daemon returned an invalid Widget catalog")
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
      throw new Error("The daemon returned an invalid Widget manifest")
    }
    if (ids.has(candidate.id)) throw new Error(`Duplicate widget ID '${candidate.id}'`)
    ids.add(candidate.id)
    validateSourceParamDefinitions(candidate.params, `Widget ${candidate.id}.params`)
    const params = candidate.params as SourceParamSchemaMap | undefined
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
    const dataRevision = candidate.dataRevision
    if (typeof dataRevision !== "string") throw new Error("Invalid Widget data revision")
    const viewRevision = candidate.viewRevision
    if (typeof viewRevision !== "string") throw new Error("Invalid Widget view revision")
    const dataFiles = candidate.dataFiles
    if (!Array.isArray(dataFiles) || !dataFiles.every(isNonEmptyString)) throw new Error("Invalid Widget data files")
    const hasData = candidate.hasData
    if (typeof hasData !== "boolean") throw new Error("Invalid Widget data flag")
    return {
      ...(params ? { params } : {}),
      dataFiles,
      dataRevision,
      viewRevision,
      hasData,
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
  if (isRecord(value) && value.type === "chart") return parseWidgetChartView(value)
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
