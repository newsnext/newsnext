import type { CardMetadata } from "./card.js"
import type { Color } from "./color.js"
import type { WidgetChartOptions } from "./widget-view.js"

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

// Layout widths use half-LiveCard units; two units match one LiveCard.
export const MIN_WIDGET_WIDTH = 2

export interface LiveWidgetLayout {
  height: number
  width: number
  x: number
  y: number
}

export type WidgetMetadata = CardMetadata

export interface WidgetPatch {
  metadata?: WidgetMetadata
  params?: Record<string, unknown>
  view?: Partial<WidgetChartOptions>
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
