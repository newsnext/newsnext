import type { Color } from "./color.js"

export type BoardLayer = "now" | "next"
export type NowLayerAutomaticSortMode = "addedAt" | "provider"
export type NowLayerSortMode = NowLayerAutomaticSortMode | "manual"

export interface NowLayerSort {
  mode: NowLayerSortMode
  automaticMode: NowLayerAutomaticSortMode
  manualOrder: string[]
}

export type NextLayerWidgetDataScope
  = | { type: "board" }
    | { type: "instances", instanceIds: string[] }

export interface NextLayerWidgetLayout {
  height: number
  width: number
  x: number
  y: number
}

export interface NextLayerWidget {
  dataScope: NextLayerWidgetDataScope
  layout: NextLayerWidgetLayout
  widgetId: string
}

export interface Board {
  color: Color
  createdAt: number
  defaultLayer: BoardLayer
  id: string
  instanceIds: string[]
  name: string
  nowLayer: {
    sort: NowLayerSort
  }
  nextLayer: {
    widgets: NextLayerWidget[]
  }
}
