import type { ApplicationData } from "./data"
import { describe, expect, it } from "vitest"
import { getBoardLiveWidgetQuery, getLiveCardQuery, getNowLayerLiveCardsQuery, listAllLiveWidgetsQuery, listBoardLiveCardsQuery, listBoardsQuery } from "./queries"

function createData(): ApplicationData {
  return {
    version: 12,
    boardOrder: ["reading"],
    boards: { reading: { color: "blue", createdAt: 1, layer: "now", name: "Reading", nowLayer: { liveCards: ["second", "first"] }, nextLayer: { liveWidgets: ["widget"] } } },
    liveCards: {
      first: { createdAt: 1, patch: {}, provider: { color: "blue", title: "RSS" }, sourceId: "rss:first", workerId: "worker" },
      second: { createdAt: 2, patch: {}, provider: { color: "blue", title: "RSS" }, sourceId: "rss:second", workerId: "worker" },
    },
    liveWidgets: { widget: { dataScope: { type: "board" }, layout: { height: 2, width: 2 }, widgetId: "snake" } },
  }
}

describe("application queries", () => {
  it("assembles ordered public Board data", () => {
    expect(listBoardsQuery(createData())[0]?.nowLayer.liveCards.map(card => card.cardId)).toEqual(["second", "first"])
    expect(listBoardLiveCardsQuery(createData(), { boardId: "reading" }).map(card => card.cardId)).toEqual(["second", "first"])
  })
  it("looks entities up directly by ID", () => {
    expect(getLiveCardQuery(createData(), { cardId: "first" }).sourceId).toBe("rss:first")
    expect(getBoardLiveWidgetQuery(createData(), { boardId: "reading", liveWidgetId: "widget" }).widgetId).toBe("snake")
    expect(listAllLiveWidgetsQuery(createData())[0]?.boardId).toBe("reading")
  })
  it("returns ordered Now Layer references", () => {
    expect(getNowLayerLiveCardsQuery(createData(), "reading").map(card => card.cardId)).toEqual(["second", "first"])
  })
})
