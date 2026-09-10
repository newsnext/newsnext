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

export interface LiveWidgetLayout {
  height: number
  width: number
  x: number
  y: number
}

export type WidgetMetadata = CardMetadata

export interface LiveWidget {
  metadata?: WidgetMetadata
  params?: Record<string, unknown>
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
