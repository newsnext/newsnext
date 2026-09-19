import type { SourceDescriptor } from "@newsnext/source-kit/types"
import type { ApplicationData } from "./data"
import { describe, expect, it } from "vitest"
import {
  getBoardLiveWidgetQuery,
  getLiveWidgetQuery,
  getNowLayerLiveCardsQuery,
  listAllLiveWidgetsQuery,
  listBoardLiveCardsQuery,
  listBoardLiveWidgetsQuery,
  listSourcesQuery,
} from "./queries"

function createData(): ApplicationData {
  return {
    version: 8,
    boards: [{
      color: "blue",
      id: "reading",
      name: "Reading",
      createdAt: 1,
      nowLayer: { liveCards: ["second", "first"] },
      defaultLayer: "now",
      nextLayer: { liveWidgets: [] },
    }],
    liveCards: [
      { cardId: "first", workerId: "worker-a", sourceId: "rss:first", patch: {}, createdAt: 1 },
      { cardId: "second", workerId: "worker-a", sourceId: "rss:second", patch: {}, createdAt: 2 },
    ],
  }
}

describe("application queries", () => {
  it("resolves Sources from query context", () => {
    const source = { id: "rss:first" } as SourceDescriptor
    expect(listSourcesQuery([source]))
      .toEqual([source])
  })

  it("lists Board LiveCards in liveCards order", () => {
    const liveCards = listBoardLiveCardsQuery(createData(), { boardId: "reading" })
    expect(liveCards.map(card => card.cardId)).toEqual(["second", "first"])
  })

  it("lists Board Widget placements in installation order", () => {
    const data = createData()
    data.boards[0]!.nextLayer.liveWidgets.push({
      dataScope: { type: "board" },
      layout: { height: 2, width: 2 },
      liveWidgetId: "instance-a",
      widgetId: "snake",
    })
    const widgets = listBoardLiveWidgetsQuery(data, { boardId: "reading" })
    expect(widgets.map(widget => widget.liveWidgetId)).toEqual(["instance-a"])
  })

  it("lists all Widget placements with their Board IDs", () => {
    const data = createData()
    data.boards[0]!.nextLayer.liveWidgets.push({
      dataScope: { type: "board" },
      layout: { height: 2, width: 2 },
      liveWidgetId: "instance-a",
      widgetId: "snake",
    })
    expect(listAllLiveWidgetsQuery(data)).toEqual([{
      boardId: "reading",
      dataScope: { type: "board" },
      layout: { height: 2, width: 2 },
      liveWidgetId: "instance-a",
      widgetId: "snake",
    }])
  })

  it("returns one Widget placement with its Board ID", () => {
    const data = createData()
    data.boards[0]!.nextLayer.liveWidgets.push({
      dataScope: { type: "board" },
      layout: { height: 2, width: 2 },
      liveWidgetId: "instance-a",
      widgetId: "snake",
    })
    expect(getBoardLiveWidgetQuery(data, { boardId: "reading", liveWidgetId: "instance-a" })).toEqual({
      boardId: "reading",
      dataScope: { type: "board" },
      layout: { height: 2, width: 2 },
      liveWidgetId: "instance-a",
      widgetId: "snake",
    })
    expect(() => getBoardLiveWidgetQuery(data, { boardId: "reading", liveWidgetId: "missing" }))
      .toThrow("LiveWidget 'missing' not found")
  })

  it("returns one Widget placement across all Boards", () => {
    const data = createData()
    data.boards[0]!.nextLayer.liveWidgets.push({
      dataScope: { type: "board" },
      layout: { height: 2, width: 2 },
      liveWidgetId: "instance-a",
      widgetId: "snake",
    })
    expect(getLiveWidgetQuery(data, { liveWidgetId: "instance-a" })).toEqual({
      boardId: "reading",
      dataScope: { type: "board" },
      layout: { height: 2, width: 2 },
      liveWidgetId: "instance-a",
      widgetId: "snake",
    })
    expect(() => getLiveWidgetQuery(data, { liveWidgetId: "missing" }))
      .toThrow("LiveWidget 'missing' not found")
  })

  it("throws for Widget placements of an unknown Board", () => {
    expect(() => listBoardLiveWidgetsQuery(createData(), { boardId: "missing" }))
      .toThrow("Board 'missing' not found")
  })

  it("returns NowLayer cards with their Board and source IDs", () => {
    expect(getNowLayerLiveCardsQuery(createData(), "reading")).toEqual([
      { boardId: "reading", cardId: "second", sourceId: "rss:second" },
      { boardId: "reading", cardId: "first", sourceId: "rss:first" },
    ])
  })
})
