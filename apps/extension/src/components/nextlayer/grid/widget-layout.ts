import type { LiveWidget } from "@/lib/board"
import { MIN_WIDGET_WIDTH } from "@newsnext/sdk/models"

export const WIDGET_GAP = 24
// Split the 400 × 500 LiveCard footprint, including its gutter, into two units.
export const WIDGET_COLUMN_WIDTH = (400 + WIDGET_GAP) / 2
export const WIDGET_ROW_HEIGHT = (500 + WIDGET_GAP) / 2
export const MAX_WIDGET_WIDTH = 4
export const MAX_WIDGET_HEIGHT = 100

const GRID_WIDGET_ID_PREFIX = "widget-"

export type ResizeAxis = "width" | "height" | "both"

export interface ChangedWidgetLayout {
  height: number
  liveWidgetId: string
  width: number
}

export interface WidgetGridNode {
  h?: number
  id?: string
  w?: number
  // Packing recomputes x/y from array order (see getWidgetGridLayout);
  // stored values are overwritten, never read.
  x?: number
  y?: number
}

export interface WidgetSlotFrame {
  height: number
  left: number
  top: number
  width: number
}

export interface WidgetResizeNode extends WidgetGridNode {
  minH: number
  minW: number
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}

// Manifest, persisted, and rendered sizes all use half-LiveCard units.
export function clampWidgetWidth(width: number): number {
  return clamp(Math.round(width), MIN_WIDGET_WIDTH, MAX_WIDGET_WIDTH)
}

// Slots and pointer resize previews share one pixel frame derived from grid spans.
export function getWidgetSlotFrame(node: WidgetGridNode): WidgetSlotFrame {
  return {
    left: (node.x ?? 0) * WIDGET_COLUMN_WIDTH,
    top: (node.y ?? 0) * WIDGET_ROW_HEIGHT,
    width: (node.w ?? 1) * WIDGET_COLUMN_WIDTH - WIDGET_GAP,
    height: (node.h ?? 1) * WIDGET_ROW_HEIGHT - WIDGET_GAP,
  }
}

// Bottom edge of the packed layout, shared by grid sizing and drag placeholders.
export function getWidgetGridHeight(nodes: readonly WidgetGridNode[]): number {
  return Math.max(0, ...nodes.map((node) => {
    const frame = getWidgetSlotFrame(node)
    return frame.top + frame.height
  }))
}

// Pointer resizing tracks the cursor in pixels within manifest minimums, the
// two-card width, and the grid's right edge; committing snaps the span to cells.
export function getResizedWidgetFrame(
  node: WidgetResizeNode,
  gridWidth: number,
  axis: ResizeAxis,
  delta: { x: number, y: number },
): WidgetSlotFrame {
  const frame = getWidgetSlotFrame(node)
  const minWidth = node.minW * WIDGET_COLUMN_WIDTH - WIDGET_GAP
  const maxWidth = Math.min(MAX_WIDGET_WIDTH * WIDGET_COLUMN_WIDTH - WIDGET_GAP, gridWidth - frame.left)
  const minHeight = node.minH * WIDGET_ROW_HEIGHT - WIDGET_GAP
  const maxHeight = MAX_WIDGET_HEIGHT * WIDGET_ROW_HEIGHT - WIDGET_GAP
  return {
    ...frame,
    width: axis === "height" ? frame.width : clamp(frame.width + delta.x, minWidth, maxWidth),
    height: axis === "width" ? frame.height : clamp(frame.height + delta.y, minHeight, maxHeight),
  }
}

export function getWidgetColumns(availableWidth: number, nodes: readonly WidgetGridNode[]): number {
  const fitting = Math.min(8, Math.max(2, Math.floor((availableWidth + WIDGET_GAP) / (WIDGET_COLUMN_WIDTH * 2)) * 2))
  const minimum = Math.max(2, ...nodes.map(node => Math.ceil((node.w ?? 1) / 2) * 2))
  return Math.max(fitting, minimum)
}

export function getResizedWidgetSize(
  initial: { w: number, h: number, minW: number, minH: number },
  delta: { x: number, y: number },
): { w: number, h: number } {
  return {
    w: Math.max(initial.minW, clampWidgetWidth(initial.w + Math.round(delta.x / WIDGET_COLUMN_WIDTH))),
    h: clamp(initial.h + Math.round(delta.y / WIDGET_ROW_HEIGHT), initial.minH, MAX_WIDGET_HEIGHT),
  }
}

// Pack the supplied user order without backfilling earlier gaps.
export function getWidgetGridLayout<T extends WidgetGridNode>(column: number, nodes: readonly T[]): T[] {
  const placed: T[] = []
  let cursor = 0
  for (const node of nodes) {
    const w = node.w ?? 1
    const h = node.h ?? 1
    if (w > column) throw new RangeError("Widget width exceeds the grid column count")
    let x: number
    let y: number
    do {
      x = cursor % column
      y = Math.floor(cursor / column)
      cursor += 1
    } while (x + w > column || placed.some(other =>
      x < (other.x ?? 0) + (other.w ?? 1) && x + w > (other.x ?? 0)
      && y < (other.y ?? 0) + (other.h ?? 1) && y + h > (other.y ?? 0),
    ))
    cursor = y * column + x + w
    placed.push({ ...node, x, y })
  }
  return placed
}

export interface WidgetDropTarget<T extends WidgetGridNode = WidgetGridNode> {
  layout: T[]
  x: number
  y: number
}

// Evaluate the actual packed result of each insertion, not a pointer's position
// within a different-sized card. Prefer the smallest order change on distance ties.
export function getWidgetDropTargets<T extends WidgetGridNode>(
  column: number,
  nodes: readonly T[],
  sourceId: string,
): WidgetDropTarget<T>[] {
  const sourceIndex = nodes.findIndex(node => node.id === sourceId)
  const source = nodes[sourceIndex]
  if (!source) return []
  const remaining = nodes.filter(node => node.id !== sourceId)
  const indices = nodes.map((_, index) => index)
    .sort((a, b) => Math.abs(a - sourceIndex) - Math.abs(b - sourceIndex))
  return indices.map((index) => {
    const order = [...remaining]
    order.splice(index, 0, source)
    const layout = getWidgetGridLayout(column, order)
    const placed = layout[index]
    return { layout, x: placed?.x ?? 0, y: placed?.y ?? 0 }
  })
}

export function getClosestWidgetDropTarget<T extends WidgetDropTarget>(
  targets: readonly T[],
  position: { x: number, y: number },
  cellSize: { width: number, height: number },
  current?: T,
): T | undefined {
  const distanceTo = (target: WidgetDropTarget) => Math.hypot(
    (target.x - position.x) * cellSize.width,
    (target.y - position.y) * cellSize.height,
  )
  let closest: T | undefined
  let closestDistance = Number.POSITIVE_INFINITY
  for (const target of targets) {
    const distance = distanceTo(target)
    if (distance < closestDistance) {
      closest = target
      closestDistance = distance
    }
  }
  // Require a meaningful advantage before switching; identical landing positions
  // retain the current preview even when they represent different insertion orders.
  if (current && targets.includes(current) && distanceTo(current) <= closestDistance + 12) return current
  return closest
}

export function getGridWidgetId(liveWidgetId: string): string {
  return `${GRID_WIDGET_ID_PREFIX}${liveWidgetId}`
}

export function getChangedWidgetLayouts(
  nodes: readonly WidgetGridNode[],
  widgets: readonly LiveWidget[],
): ChangedWidgetLayout[] {
  const widgetsById = new Map(widgets.map(widget => [widget.liveWidgetId, widget]))
  const ordered = nodes.flatMap((node) => {
    if (!node.id?.startsWith(GRID_WIDGET_ID_PREFIX)
      || node.w === undefined
      || node.h === undefined) {
      return []
    }
    const liveWidgetId = node.id.slice(GRID_WIDGET_ID_PREFIX.length)
    const widget = widgetsById.get(liveWidgetId)
    if (!widget) return []
    return [{ liveWidgetId, width: node.w, height: node.h }]
  })
  if (ordered.length !== widgets.length) return []
  const changed = ordered.some((entry, index) => {
    const widget = widgets[index]
    return widget?.liveWidgetId !== entry.liveWidgetId
      || widget.layout.width !== entry.width
      || widget.layout.height !== entry.height
  })
  return changed ? ordered : []
}
