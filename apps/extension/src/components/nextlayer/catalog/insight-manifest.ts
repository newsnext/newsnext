import type { InsightWordCloudView } from "@newsnext/sdk/models"
import type { Color } from "@newsnext/shared/types"
import type { SourceParamSchemaMap } from "@newsnext/source-kit/types"
import { isThemeColor, MIN_WIDGET_WIDTH, parseInsightWordCloudView } from "@newsnext/sdk/models"
import { validateSourceParamDefinitions } from "@newsnext/source-kit/core"

/** `insight.json.view` selector. The daemon selects a custom view when `index.html` exists. */
export type InsightView
  = | InsightWordCloudView
    /** Built-in LiveCard UI; `query` names the manifest query holding NewsItems. Omit `presentation` for auto timeline/list. */
    | { preset: "live-card", query: string, presentation?: "ranking" | "list" }

/** Validated Insight definition from the daemon catalog. Directory name is the Insight ID. */
export interface LocalInsightManifest {
  /** Optional placement-scoped settings; same param schema as Sources. */
  params?: SourceParamSchemaMap
  /** Named palette color; `slate` when omitted. */
  color: Color
  /** False when no queries and no `data.mjs`; the shell hides refresh. */
  hasData: boolean
  /** Footprint in half-LiveCard grid units (width 2–4, defaults 2). */
  height: number
  id: string
  minHeight: number
  minWidth: number
  title: string
  /** Entry document URL; only custom views declare one. */
  url?: string
  view?: InsightView
  /** Data-pipeline fingerprint; view fingerprint remounts the placed frame. */
  dataRevision: string
  viewRevision: string
  /** Visible polling interval; default 300s, minimum 60s. No background schedule. */
  refreshIntervalMs: number
  dataFiles: string[]
  width: number
}

/** The catalog the daemon publishes, or the reason its definitions cannot be rendered. */
export interface InsightCatalog {
  error?: string
  insights: LocalInsightManifest[]
}

/** Validates the catalog the daemon pushes over the native protocol. */
export function parseInsightCatalog(
  value: unknown,
  serverOrigin: string | undefined,
): LocalInsightManifest[] {
  if (!serverOrigin) return []
  if (!Array.isArray(value)) throw new Error("The daemon returned an invalid Insight catalog")
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
      throw new Error("The daemon returned an invalid Insight manifest")
    }
    if (ids.has(candidate.id)) throw new Error(`Duplicate insight ID '${candidate.id}'`)
    ids.add(candidate.id)
    validateSourceParamDefinitions(candidate.params, `Insight ${candidate.id}.params`)
    const params = candidate.params as SourceParamSchemaMap | undefined
    const ui = parseInsightView(candidate.view)
    let url: URL | undefined
    if (ui === undefined) {
      if (typeof candidate.url !== "string") throw new Error("Custom Insight UI requires an entry URL")
      url = new URL(candidate.url)
      if (url.origin !== expectedOrigin || !url.pathname.startsWith(`/insights/${candidate.id}/`)) {
        throw new Error(`Insight '${candidate.id}' has an invalid entry URL`)
      }
    } else if (candidate.url !== undefined) {
      throw new Error("Built-in Insight UI must not declare an entry URL")
    }
    const refreshIntervalMs = candidate.refreshIntervalMs ?? 300_000
    if (!Number.isSafeInteger(refreshIntervalMs) || Number(refreshIntervalMs) < 60_000) {
      throw new Error("Invalid Insight refresh interval")
    }
    const dataRevision = candidate.dataRevision
    if (typeof dataRevision !== "string") throw new Error("Invalid Insight data revision")
    const viewRevision = candidate.viewRevision
    if (typeof viewRevision !== "string") throw new Error("Invalid Insight view revision")
    const dataFiles = candidate.dataFiles
    if (!Array.isArray(dataFiles) || !dataFiles.every(isNonEmptyString)) throw new Error("Invalid Insight data files")
    const hasData = candidate.hasData
    if (typeof hasData !== "boolean") throw new Error("Invalid Insight data flag")
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
      minWidth: Math.max(MIN_WIDGET_WIDTH, candidate.minWidth),
      title: candidate.title,
      url: url?.href,
      view: ui,
      refreshIntervalMs: Number(refreshIntervalMs),
      width: Math.max(MIN_WIDGET_WIDTH, candidate.width),
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

export function parseInsightView(value: unknown): InsightView | undefined {
  if (value === undefined) return undefined
  if (isRecord(value) && value.preset === "word-cloud") return parseInsightWordCloudView(value)
  if (isRecord(value) && value.preset === "live-card" && isIdentifier(value.query)
    && (value.presentation === undefined || value.presentation === "ranking" || value.presentation === "list")
    && Object.keys(value).every(key => key === "preset" || key === "query" || key === "presentation")) {
    return {
      preset: "live-card",
      query: value.query,
      ...(value.presentation === undefined ? {} : { presentation: value.presentation }),
    }
  }
  throw new Error("Invalid Insight UI")
}
