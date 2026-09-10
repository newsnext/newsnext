import type { NextLayerWidget, NextLayerWidgetLayout } from "@/lib/board"

export const WIDGET_GAP = 24
// Split the 400 × 500 LiveCard footprint, including its gutter, into two units.
export const WIDGET_COLUMN_WIDTH = (400 + WIDGET_GAP) / 2
export const WIDGET_ROW_HEIGHT = (500 + WIDGET_GAP) / 2

const GRID_WIDGET_ID_PREFIX = "widget-"

export interface ChangedWidgetLayout {
  layout: NextLayerWidgetLayout
  widgetId: string
}

export interface WidgetGridNode {
  h?: number
  id?: string
  w?: number
  x?: number
  y?: number
}

// Manifest, persisted, and rendered sizes all use half-LiveCard units.
export function clampWidgetWidth(width: number): number {
  return Math.max(1, Math.min(4, Math.round(width)))
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
    h: Math.max(initial.minH, Math.min(100, initial.h + Math.round(delta.y / WIDGET_ROW_HEIGHT))),
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

export function getGridWidgetId(widgetId: string): string {
  return `${GRID_WIDGET_ID_PREFIX}${widgetId}`
}

export function getChangedWidgetLayouts(
  nodes: readonly WidgetGridNode[],
  widgets: readonly NextLayerWidget[],
): ChangedWidgetLayout[] {
  const widgetsById = new Map(widgets.map(widget => [widget.widgetId, widget]))
  const orderedNodes = [...nodes].sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0))
  let order = 0
  return orderedNodes.flatMap((node) => {
    if (!node.id?.startsWith(GRID_WIDGET_ID_PREFIX)
      || node.x === undefined
      || node.y === undefined
      || node.w === undefined
      || node.h === undefined) {
      return []
    }
    const widgetId = node.id.slice(GRID_WIDGET_ID_PREFIX.length)
    const widget = widgetsById.get(widgetId)
    if (!widget) return []
    // Keep the existing wire shape, but persist an order rather than viewport coordinates.
    const layout = { x: 0, y: order++, width: node.w, height: node.h }
    return layoutsEqual(widget.layout, layout) ? [] : [{ widgetId, layout }]
  })
}

function layoutsEqual(left: NextLayerWidgetLayout, right: NextLayerWidgetLayout): boolean {
  return left.x === right.x
    && left.y === right.y
    && left.width === right.width
    && left.height === right.height
}
