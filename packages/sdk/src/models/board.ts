import type { CardMetadata } from "./card.js"
import type { Color } from "./color.js"

export type BoardLayer = "now" | "next"
export type NowLayerAutomaticSortMode = "addedAt" | "provider"
export type NowLayerSortMode = NowLayerAutomaticSortMode | "manual"

export interface NowLayerSort {
  mode: NowLayerSortMode
  automaticMode: NowLayerAutomaticSortMode
  manualOrder: string[]
}

export type LiveWidgetDataScope
  = | { type: "board" }
    | { type: "cards", cardIds: string[] }

// Widget sizes use half-LiveCard units; one unit is the smallest placeable width.
// Placement order is the array order of the Board's Next Layer Widgets.
export const MIN_WIDGET_WIDTH = 1

export interface LiveWidgetLayout {
  height: number
  width: number
}

// Sparse install size. Placements always append after the Board's existing
// Widgets; position is the installation order, not coordinates.
export interface LiveWidgetInstallSize {
  height?: number
  width?: number
}

export type WidgetMetadata = CardMetadata

export interface WidgetPatch {
  metadata?: WidgetMetadata
  params?: Record<string, unknown>
}

export interface LiveWidget {
  liveWidgetId: string
  patch?: WidgetPatch
  dataScope: LiveWidgetDataScope
  layout: LiveWidgetLayout
  widgetId: string
}

export interface Board {
  color: Color
  createdAt: number
  defaultLayer: BoardLayer
  id: string
  cardIds: string[]
  name: string
  nowLayer: {
    sort: NowLayerSort
  }
  nextLayer: {
    liveWidgets: LiveWidget[]
  }
}
