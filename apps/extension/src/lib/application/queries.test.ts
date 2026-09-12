import type { SourceDescriptor } from "@newsnext/source-kit/types"
import type { ApplicationData } from "./data"
import { describe, expect, it } from "vitest"
import {
  getBoardConfigurationQuery,
  getNowLayerLiveCardsQuery,
  listBoardLiveCardsQuery,
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
      cardIds: ["second", "first"],
      defaultLayer: "now",
      nowLayer: { sort: { mode: "addedAt", automaticMode: "addedAt", manualOrder: [] } },
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

  it("lists Board LiveCards in cardIds order", () => {
    const liveCards = listBoardLiveCardsQuery(createData(), { boardId: "reading" })
    expect(liveCards.map(card => card.cardId)).toEqual(["second", "first"])
  })

  it("returns NowLayer cards without registry filtering", () => {
    expect(getNowLayerLiveCardsQuery(createData(), "reading")).toEqual([
      { boardId: "reading", cardId: "second", sourceId: "rss:second" },
      { boardId: "reading", cardId: "first", sourceId: "rss:first" },
    ])
  })

  it("returns nested Board configuration", () => {
    expect(getBoardConfigurationQuery(createData(), { boardId: "reading" })).toEqual({
      color: "blue",
      defaultLayer: "now",
      nowLayer: { sort: { mode: "addedAt", automaticMode: "addedAt", manualOrder: [] } },
    })
  })
})
