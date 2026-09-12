import { expect, it } from "vitest"
import { getSortableData, getSortableRemovalTarget, isSortableData } from "./sortable-data"

it("isolates Widget sorting from LiveCard drop targets", () => {
  const widget = getSortableData({ id: "widget-weather", cardId: "grid", kind: "widget" })
  const card = getSortableData({ id: "weather", cardId: "board" })
  expect(isSortableData(widget)).toBe(false)
  expect(isSortableData(widget, "widget")).toBe(true)
  expect(isSortableData(card)).toBe(true)
  expect(isSortableData(card, "widget")).toBe(false)
  expect(isSortableData({ id: "weather", cardId: "board", kind: "card" })).toBe(false)
})

it("resolves removal targets without confusing grid IDs with Widget IDs", () => {
  expect(getSortableRemovalTarget(getSortableData({ id: "weather", cardId: "board" })))
    .toEqual({ kind: "card", cardId: "weather" })
  expect(getSortableRemovalTarget(getSortableData({
    id: "widget-weather",
    cardId: "grid",
    kind: "widget",
    boardId: "original-board",
    liveWidgetId: "weather",
  }))).toEqual({ kind: "widget", boardId: "original-board", liveWidgetId: "weather" })
})

it("rejects unscoped or malformed Widget removal targets", () => {
  const widget = getSortableData({ id: "widget-weather", cardId: "grid", kind: "widget" })
  expect(getSortableRemovalTarget(widget)).toBeUndefined()
  for (const invalid of [undefined, "", 42, null]) {
    expect(getSortableRemovalTarget({ ...widget, boardId: invalid, liveWidgetId: "weather" })).toBeUndefined()
    expect(getSortableRemovalTarget({ ...widget, boardId: "board", liveWidgetId: invalid })).toBeUndefined()
  }
  expect(getSortableRemovalTarget({ id: "weather", cardId: "board", kind: "card" })).toBeUndefined()
})
