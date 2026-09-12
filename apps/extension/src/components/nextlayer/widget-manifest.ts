import type { WidgetChartView } from "@newsnext/sdk/models"
import type { Color } from "@newsnext/shared/types"
import type { SourceParamSchemaMap } from "@newsnext/source-kit/types"
import { isThemeColor, parseWidgetChartView } from "@newsnext/sdk/models"
import { validateSourceParamDefinitions } from "@newsnext/source-kit/core"

export type WidgetUi
  = | WidgetChartView
    | { type: "custom" }
    | { type: "live-card", query: string, presentation?: "ranking" | "list" }

export interface LocalWidgetManifest {
  params?: SourceParamSchemaMap
  color: Color
  height: number
  id: string
  minHeight: number
  minWidth: number
  title: string
  url?: string
  view: WidgetUi
  dataRevision: string
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
    const dataRevision = candidate.dataRevision ?? "legacy"
    if (typeof dataRevision !== "string") throw new Error("Invalid Widget data revision")
    const dataFiles = candidate.dataFiles ?? []
    if (!Array.isArray(dataFiles) || !dataFiles.every(isNonEmptyString)) throw new Error("Invalid Widget data files")
    return {
      ...(params ? { params } : {}),
      dataFiles,
      dataRevision,
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
