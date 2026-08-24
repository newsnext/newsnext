import type { NextLayerWidget, NextLayerWidgetLayout } from "@/lib/board"

const GRID_WIDGET_ID_PREFIX = "widget-"

export interface ChangedWidgetLayout {
  layout: NextLayerWidgetLayout
  widgetId: string
}

interface GridWidgetNode {
  h?: number
  id?: string
  w?: number
  x?: number
  y?: number
}

export function getGridWidgetId(widgetId: string): string {
  return `${GRID_WIDGET_ID_PREFIX}${widgetId}`
}

export function getChangedWidgetLayouts(
  nodes: readonly GridWidgetNode[],
  widgets: readonly NextLayerWidget[],
): ChangedWidgetLayout[] {
  const widgetsById = new Map(widgets.map(widget => [widget.widgetId, widget]))
  return nodes.flatMap((node) => {
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
    const layout = { x: node.x, y: node.y, width: node.w, height: node.h }
    return layoutsEqual(widget.layout, layout) ? [] : [{ widgetId, layout }]
  })
}

function layoutsEqual(left: NextLayerWidgetLayout, right: NextLayerWidgetLayout): boolean {
  return left.x === right.x
    && left.y === right.y
    && left.width === right.width
    && left.height === right.height
}
