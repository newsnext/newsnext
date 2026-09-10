import { expect, it } from "vitest"
import { getSortableData, getSortableRemovalTarget, isSortableData } from "./sortable-data"

it("isolates Widget sorting from Instance drop targets", () => {
  const widget = getSortableData({ id: "widget-weather", instanceId: "grid", kind: "widget" })
  const instance = getSortableData({ id: "weather", instanceId: "board" })
  expect(isSortableData(widget)).toBe(false)
  expect(isSortableData(widget, "widget")).toBe(true)
  expect(isSortableData(instance)).toBe(true)
  expect(isSortableData(instance, "widget")).toBe(false)
  expect(isSortableData({ id: "weather", instanceId: "board", kind: "instance" })).toBe(false)
})

it("resolves removal targets without confusing grid IDs with Widget IDs", () => {
  expect(getSortableRemovalTarget(getSortableData({ id: "weather", instanceId: "board" })))
    .toEqual({ kind: "instance", instanceId: "weather" })
  expect(getSortableRemovalTarget(getSortableData({
    id: "widget-weather",
    instanceId: "grid",
    kind: "widget",
    boardId: "original-board",
    widgetId: "weather",
  }))).toEqual({ kind: "widget", boardId: "original-board", widgetId: "weather" })
})

it("rejects unscoped or malformed Widget removal targets", () => {
  const widget = getSortableData({ id: "widget-weather", instanceId: "grid", kind: "widget" })
  expect(getSortableRemovalTarget(widget)).toBeUndefined()
  for (const invalid of [undefined, "", 42, null]) {
    expect(getSortableRemovalTarget({ ...widget, boardId: invalid, widgetId: "weather" })).toBeUndefined()
    expect(getSortableRemovalTarget({ ...widget, boardId: "board", widgetId: invalid })).toBeUndefined()
  }
  expect(getSortableRemovalTarget({ id: "weather", instanceId: "board", kind: "instance" })).toBeUndefined()
})
