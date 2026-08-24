import { describe, expect, it } from "vitest"
import { getChangedWidgetLayouts } from "./widget-layout"

const widget = {
  widgetId: "headlines",
  dataScope: { type: "board" as const },
  layout: { x: 0, y: 0, width: 6, height: 4 },
}

describe("getChangedWidgetLayouts", () => {
  it("returns only installed Widgets whose layout changed", () => {
    expect(getChangedWidgetLayouts([
      { id: "widget-headlines", x: 1, y: 2, w: 6, h: 5 },
      { id: "widget-missing", x: 0, y: 0, w: 1, h: 1 },
    ], [widget])).toEqual([{
      widgetId: "headlines",
      layout: { x: 1, y: 2, width: 6, height: 5 },
    }])
  })

  it("omits unchanged and incomplete nodes", () => {
    expect(getChangedWidgetLayouts([
      { id: "widget-headlines", x: 0, y: 0, w: 6, h: 4 },
      { id: "widget-headlines", x: 1 },
    ], [widget])).toEqual([])
  })
})
