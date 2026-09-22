import type { ApplicationData } from "./data"
import { describe, expect, it } from "vitest"
import { getApplicationBoards } from "./data"
import { configureLiveCardMutation, configureLiveWidgetMutation, createBoardMutation, createLiveCardMutation, createLiveWidgetMutation, deleteBoardMutation, deleteLiveCardMutation, moveLiveCardMutation, moveLiveWidgetMutation, setLiveWidgetLayoutsMutation, setNextLayerManualOrderMutation, setNowLayerManualOrderMutation } from "./mutations"

const dependencies = { createId: () => "new", now: () => 100, workerId: "worker-a" }

function createData(): ApplicationData {
  return {
    version: 12,
    boardOrder: ["reading"],
    boards: { reading: { color: "blue", createdAt: 1, layer: "now", name: "Reading", nowLayer: { liveCards: ["one"] }, nextLayer: { liveWidgets: [] } } },
    liveCards: { one: { createdAt: 1, patch: {}, provider: { color: "blue", title: "RSS" }, sourceId: "rss:feed", workerId: "worker-a" } },
    liveWidgets: {},
  }
}

function withTarget(data = createData()): ApplicationData {
  return { ...data, boardOrder: [...data.boardOrder, "target"], boards: { ...data.boards, target: { color: "purple", createdAt: 2, layer: "now", name: "Target", nowLayer: { liveCards: [] }, nextLayer: { liveWidgets: [] } } } }
}

describe("application mutations", () => {
  it("updates one LiveCard by ID without rebuilding Boards", () => {
    const data = createData()
    const result = configureLiveCardMutation(data, { cardId: "one", patch: { params: { limit: 5 } } }).data
    expect(result.boards).toBe(data.boards)
    expect(result.liveCards.one?.patch.params).toEqual({ limit: 5 })
  })

  it("creates and reorders Boards by explicit order", () => {
    const result = createBoardMutation(createData(), { name: " AI ", color: "purple", layer: "next" }, dependencies).data
    expect(Object.keys(result.boards)).toEqual(["reading", "new"])
    expect(getApplicationBoards(result).map(board => board.id)).toEqual(["reading", "new"])
    expect(result.boardOrder).toEqual(["reading", "new"])
    expect(result.boards.new).toMatchObject({ name: "AI" })
  })

  it("creates, moves, reorders and deletes LiveCards by ID", () => {
    const created = createLiveCardMutation(withTarget(), { boardId: "reading", sourceId: "rss:new", provider: { color: "slate", title: "RSS" }, patch: {} }, dependencies).data
    expect(getApplicationBoards(created)[0]?.nowLayer.liveCards.map(card => card.cardId)).toEqual(["new", "one"])
    const reordered = setNowLayerManualOrderMutation(created, { boardId: "reading", liveCards: ["one", "new"] }).data
    expect(getApplicationBoards(reordered)[0]?.nowLayer.liveCards.map(card => card.cardId)).toEqual(["one", "new"])
    const moved = moveLiveCardMutation(reordered, { boardId: "target", cardId: "one" }).data
    expect(moved.boards.target?.nowLayer.liveCards).toEqual(["one"])
    expect(deleteLiveCardMutation(moved, { cardId: "one" }).data.liveCards.one).toBeUndefined()
  })

  it("stores Widgets independently and keeps their scopes valid", () => {
    const installed = createLiveWidgetMutation(withTarget(), { boardId: "reading", widgetId: "feed", dataScope: { type: "cards", cardIds: ["one"] }, size: {} }, { createId: () => "widget" }).data
    expect(installed.liveWidgets.widget).toMatchObject({ layout: { height: 2, width: 2 } })
    expect(installed.boards.reading?.nextLayer.liveWidgets).toEqual(["widget"])
    const configured = configureLiveWidgetMutation(installed, { liveWidgetId: "widget", patch: { metadata: { title: " Feed " } } }).data
    expect(configured.liveWidgets.widget?.patch?.metadata?.title).toBe("Feed")
    const moved = moveLiveWidgetMutation(configured, { boardId: "target", liveWidgetId: "widget" }).data
    expect(moved.liveWidgets.widget?.dataScope).toEqual({ type: "cards", cardIds: [] })
  })

  it("reorders and resizes Widgets", () => {
    const first = createLiveWidgetMutation(createData(), { boardId: "reading", widgetId: "feed", dataScope: { type: "board" }, size: {} }, { createId: () => "first" }).data
    const second = createLiveWidgetMutation(first, { boardId: "reading", widgetId: "feed", dataScope: { type: "board" }, size: {} }, { createId: () => "second" }).data
    const ordered = setNextLayerManualOrderMutation(second, { boardId: "reading", widgetIds: ["first", "second"] }).data
    const resized = setLiveWidgetLayoutsMutation(ordered, { boardId: "reading", liveWidgets: [{ liveWidgetId: "second", width: 4, height: 3 }, { liveWidgetId: "first", width: 2, height: 2 }] }).data
    expect(getApplicationBoards(resized)[0]?.nextLayer.liveWidgets.map(widget => widget.liveWidgetId)).toEqual(["second", "first"])
    expect(resized.liveWidgets.second?.layout).toEqual({ width: 4, height: 3 })
  })

  it("transfers a deleted Board's entities before the target's entities", () => {
    const data = withTarget()
    data.liveCards.target = { ...data.liveCards.one! }
    data.boards.target!.nowLayer.liveCards = ["target"]
    const result = deleteBoardMutation(data, { boardId: "reading", targetBoardId: "target" }).data
    expect(result.boards.reading).toBeUndefined()
    expect(getApplicationBoards(result)[0]?.nowLayer.liveCards.map(card => card.cardId)).toEqual(["one", "target"])
  })
})
