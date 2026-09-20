import type { CardMetadata } from "./card.js"
import type { Color } from "./color.js"

export type BoardLayer = "now" | "next"

/** Snapshot query scope. `board` follows the Board's full LiveCard list; installed views use their placement's scope. */
export type LiveWidgetDataScope
  = | { type: "board" }
    | { type: "cards", cardIds: string[] }

// Widget sizes use half-LiveCard units; one unit is the smallest placeable width.
// Placement order is the array order of the Board's Next Layer Widgets.
export const MIN_WIDGET_WIDTH = 1

/** Grid span in half-LiveCard grid units. */
export interface LiveWidgetLayout {
  height: number
  width: number
}

// Sparse install size. Placements prepend before the Board's existing
// Widgets; position is the array order, not coordinates.
export interface LiveWidgetInstallSize {
  height?: number
  width?: number
}

export type WidgetMetadata = CardMetadata

export interface WidgetPatch {
  /** Display overrides; `null` resets the section, `{}` is an empty merge. Metadata never affects data identity. */
  metadata?: WidgetMetadata
  /** Sparse data-param overrides; `{}` restores manifest defaults. Only resolved params affect data identity. */
  params?: Record<string, unknown>
}

/** Installed Widget instance. `widgetId` names the definition; edits target `liveWidgetId` only. */
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
  layer: BoardLayer
  id: string
  name: string
  nowLayer: {
    liveCards: string[]
  }
  nextLayer: {
    liveWidgets: LiveWidget[]
  }
}
