import type { WidgetDropTarget } from "./widget-layout"
import { describe, expect, it } from "vitest"
import { clampWidgetWidth, getChangedWidgetLayouts, getClosestWidgetDropTarget, getResizedWidgetSize, getWidgetColumns, getWidgetDropTargets, getWidgetGridLayout, WIDGET_COLUMN_WIDTH, WIDGET_ROW_HEIGHT } from "./widget-layout"

const cellSize = { width: WIDGET_COLUMN_WIDTH, height: WIDGET_ROW_HEIGHT }

const widget = {
  widgetId: "headlines",
  dataScope: { type: "board" as const },
  layout: { x: 0, y: 0, width: 3, height: 4 },
}

describe("getChangedWidgetLayouts", () => {
  it("returns only installed Widgets whose layout changed", () => {
    expect(getChangedWidgetLayouts([
      { id: "widget-headlines", x: 1, y: 2, w: 3, h: 5 },
      { id: "widget-missing", x: 0, y: 0, w: 1, h: 1 },
    ], [widget])).toEqual([{
      widgetId: "headlines",
      layout: { x: 0, y: 0, width: 3, height: 5 },
    }])
  })

  it("omits unchanged and incomplete nodes", () => {
    expect(getChangedWidgetLayouts([
      { id: "widget-headlines", x: 0, y: 0, w: 3, h: 4 },
      { id: "widget-headlines", x: 1 },
    ], [widget])).toEqual([])
  })
})

describe("clampWidgetWidth", () => {
  it("clamps widths to at least one card while retaining half-card increments", () => {
    expect([1, 2, 3, 4, 6, 8, 12].map(clampWidgetWidth)).toEqual([2, 2, 3, 4, 4, 4, 4])
  })
})

describe("getWidgetGridLayout", () => {
  const nodes = [
    { id: "first", x: 6, y: 10, w: 2, h: 4 },
    { id: "second", x: 0, y: 0, w: 3, h: 2 },
    { id: "third", x: 7, y: 0, w: 1, h: 2 },
  ]

  it("uses supplied order instead of old coordinates and never backfills gaps", () => {
    const before = structuredClone(nodes)
    expect(getWidgetGridLayout(4, nodes)).toEqual([
      { ...nodes[0], x: 0, y: 0 },
      { ...nodes[1], x: 0, y: 4 },
      { ...nodes[2], x: 3, y: 4 },
    ])
    expect(nodes).toEqual(before)
  })

  it("produces the same layout regardless of previous viewport widths", () => {
    const original = getWidgetGridLayout(8, nodes)
    let current = original
    for (const columns of [4, 6, 8, 6, 4, 8]) {
      current = getWidgetGridLayout(columns, current)
      expect(current.map(node => node.id)).toEqual(nodes.map(node => node.id))
      expect(current.map(node => node.w)).toEqual(nodes.map(node => node.w))
    }
    expect(current).toEqual(original)
  })
})

it("saves user order independently of viewport positions", () => {
  const widgets = [widget, { ...widget, widgetId: "second", layout: { ...widget.layout, y: 1 } }]
  expect(getChangedWidgetLayouts([
    { id: "widget-second", x: 0, y: 0, w: 3, h: 4 },
    { id: "widget-headlines", x: 0, y: 4, w: 3, h: 4 },
  ], widgets)).toEqual([
    { widgetId: "second", layout: { x: 0, y: 0, width: 3, height: 4 } },
    { widgetId: "headlines", layout: { x: 0, y: 1, width: 3, height: 4 } },
  ])
})

describe("widget insertion order", () => {
  const original = getWidgetGridLayout(8, [
    { id: "widget-a", w: 2, h: 4 },
    { id: "widget-b", w: 4, h: 3 },
    { id: "widget-c", w: 2, h: 6 },
    { id: "widget-d", w: 2, h: 4 },
  ])

  it("inserts a dragged widget before its target without reordering peers", () => {
    const ordered = getClosestWidgetDropTarget(getWidgetDropTargets(8, original, "widget-d"), { x: 2.5, y: 1 }, cellSize)!.layout
    expect(ordered.map(node => node.id)).toEqual(["widget-a", "widget-d", "widget-b", "widget-c"])
    const packed = getWidgetGridLayout(8, ordered)
    const widgets = original.map((node, order) => ({
      widgetId: node.id.slice("widget-".length),
      dataScope: { type: "board" as const },
      layout: { x: 0, y: order, width: node.w, height: node.h },
    }))
    const updates = getChangedWidgetLayouts(packed, widgets)
    const reloaded = widgets.map(widget => ({
      ...widget,
      layout: updates.find(update => update.widgetId === widget.widgetId)?.layout ?? widget.layout,
    })).sort((a, b) => a.layout.y - b.layout.y)
    expect(reloaded.map(widget => widget.widgetId)).toEqual(["a", "d", "b", "c"])
    expect(original.map(node => node.id)).toEqual(["widget-a", "widget-b", "widget-c", "widget-d"])
  })

  it("keeps the remaining order when inserting after a target or resizing", () => {
    const ordered = getClosestWidgetDropTarget(getWidgetDropTargets(8, original, "widget-a"), { x: 4.1, y: 0 }, cellSize)!.layout
    expect(ordered.map(node => node.id)).toEqual(["widget-b", "widget-a", "widget-c", "widget-d"])
    const resized = ordered.map(node => node.id === "widget-b" ? { ...node, w: 2, h: 8 } : node)
    expect(getWidgetGridLayout(4, resized).map(node => node.id)).toEqual(ordered.map(node => node.id))
  })
})

describe("widget drop preview", () => {
  const source = [
    { id: "a", w: 2, h: 4 },
    { id: "wide", w: 4, h: 3 },
    { id: "c", w: 2, h: 6 },
    { id: "d", w: 2, h: 4 },
  ]

  it("selects the actual landing position of a wide card, including wrapping", () => {
    const targets = getWidgetDropTargets(8, source, "wide")
    const target = getClosestWidgetDropTarget(targets, { x: 4, y: 4 }, cellSize)!
    expect(target.layout.map(node => node.id)).toEqual(["a", "c", "d", "wide"])
    expect(target.layout.find(node => node.id === "wide")).toMatchObject({ x: 4, y: 4, w: 4 })
    expect(getWidgetGridLayout(8, target.layout)).toEqual(target.layout)
  })

  it("uses pixel distance rather than treating rows and columns as equal units", () => {
    const targets = [{ x: 0, y: 1, layout: [] }, { x: 1, y: 0, layout: [] }]
    expect(getClosestWidgetDropTarget(targets, { x: 0, y: 0 }, cellSize)).toBe(targets[1])
  })

  it("preserves the existing slot when multiple orders have the same landing position", () => {
    const nodes = [{ id: "a", w: 1, h: 1 }, { id: "b", w: 1, h: 1 }, { id: "wide", w: 4, h: 1 }]
    const targets = getWidgetDropTargets(4, nodes, "wide")
    const target = getClosestWidgetDropTarget(targets, { x: 0, y: 1 }, cellSize)!
    expect(target.layout.map(node => node.id)).toEqual(["a", "b", "wide"])
    expect(targets).toHaveLength(nodes.length)
  })
})

describe("fixed widget widths and resizing", () => {
  it("wraps whole cards and permits overflow instead of shrinking widgets", () => {
    expect([300, 400, 823, 824, 1248, 1672, 2200].map(width => getWidgetColumns(width, [{ w: 2 }]))).toEqual([2, 2, 2, 4, 6, 8, 8])
    expect(getWidgetColumns(300, [{ w: 4 }])).toBe(4)
    expect(getWidgetColumns(600, [{ w: 3 }])).toBe(4)
  })

  it("snaps resizing to cell boundaries and honors size limits", () => {
    const original = { w: 2, h: 4, minW: 1, minH: 2 }
    expect(getResizedWidgetSize(original, { x: 100, y: 20 })).toEqual({ w: 2, h: 4 })
    expect(getResizedWidgetSize(original, { x: 212, y: 262 })).toEqual({ w: 3, h: 5 })
    expect(getResizedWidgetSize(original, { x: -1000, y: -1000 })).toEqual({ w: 2, h: 2 })
    expect(getResizedWidgetSize(original, { x: 10000, y: 100000 })).toEqual({ w: 4, h: 100 })
    expect(original).toEqual({ w: 2, h: 4, minW: 1, minH: 2 })
  })
})

describe("stable widget drop selection", () => {
  it("holds the preview near a boundary and switches after a clear distance advantage", () => {
    const targets = [{ x: 0, y: 0, layout: [] }, { x: 1, y: 0, layout: [] }]
    let current: WidgetDropTarget | undefined = targets[0]
    for (const x of [105, 109, 104, 112]) {
      current = getClosestWidgetDropTarget(targets, { x: x / 212, y: 0 }, cellSize, current)!
      expect(current).toBe(targets[0])
    }
    current = getClosestWidgetDropTarget(targets, { x: 113 / 212, y: 0 }, cellSize, current)!
    expect(current).toBe(targets[1])
    expect(getClosestWidgetDropTarget(targets, { x: 103 / 212, y: 0 }, cellSize, current)).toBe(current)
    expect(getClosestWidgetDropTarget(targets, { x: 99 / 212, y: 0 }, cellSize, current)).toBe(targets[0])
  })

  it("retains the active insertion when different orders share a landing position", () => {
    const nodes = [{ id: "a", w: 1, h: 1 }, { id: "b", w: 1, h: 1 }, { id: "wide", w: 4, h: 1 }]
    const targets = getWidgetDropTargets(4, nodes, "wide")
    expect(targets[1]!.layout.map(node => node.id)).toEqual(["a", "wide", "b"])
    expect(getClosestWidgetDropTarget(targets, { x: 0, y: 1 }, cellSize, targets[1])).toBe(targets[1])
  })

  it("prefers the smallest order change when entering overlapping candidates afresh", () => {
    const nodes = [...Array.from({ length: 8 }, (_, index) => ({ id: String(index), w: 1, h: 1 })), { id: "wide", w: 4, h: 1 }]
    const targets = getWidgetDropTargets(4, nodes, "wide")
    const target = getClosestWidgetDropTarget(targets, { x: 0, y: 1 }, cellSize)!
    expect(target.layout.findIndex(node => node.id === "wide")).toBe(4)
    expect(target.layout.filter(node => node.id !== "wide").map(node => node.id)).toEqual(nodes.slice(0, 8).map(node => node.id))
  })

  it("ignores a stale preview after the column count changes", () => {
    const stale = { x: 0, y: 0, layout: [] }
    const targets = [{ x: 1, y: 0, layout: [] }]
    expect(getClosestWidgetDropTarget(targets, { x: 0, y: 0 }, cellSize, stale)).toBe(targets[0])
    expect(getClosestWidgetDropTarget([], { x: 0, y: 0 }, cellSize, stale)).toBeUndefined()
  })
})
