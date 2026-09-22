import { describe, expect, it } from "vitest"
import { normalizeApplicationData } from "./persisted-data"

const currentData = {
  version: 12,
  boardOrder: ["board"],
  boards: {
    board: {
      color: "blue",
      createdAt: 1,
      layer: "now",
      name: "Board",
      nowLayer: { liveCards: ["card"] },
      nextLayer: { liveWidgets: ["widget"] },
    },
  },
  liveCards: {
    card: {
      createdAt: 1,
      patch: {},
      provider: { color: "blue", title: "RSS" },
      sourceId: "rss:feed",
      workerId: "worker",
    },
  },
  liveWidgets: {
    widget: {
      dataScope: { type: "cards", cardIds: ["card"] },
      layout: { height: 2, width: 3 },
      widgetId: "headlines",
    },
  },
} as const

describe("normalizeApplicationData", () => {
  it("normalizes current keyed data idempotently", () => {
    const normalized = normalizeApplicationData(currentData)
    expect(normalized).toEqual(currentData)
    expect(normalizeApplicationData(normalized)).toEqual(normalized)
  })

  it("removes orphaned and duplicate entity references", () => {
    const normalized = normalizeApplicationData({
      ...currentData,
      boardOrder: ["board", "board", "missing"],
      boards: {
        ...currentData.boards,
        second: {
          ...currentData.boards.board,
          name: "Second",
          nowLayer: { liveCards: ["card"] },
          nextLayer: { liveWidgets: ["widget"] },
        },
      },
      liveCards: {
        ...currentData.liveCards,
        orphan: currentData.liveCards.card,
      },
    })

    expect(normalized.boardOrder).toEqual(["board", "second"])
    expect(normalized.boards.second?.nowLayer.liveCards).toEqual([])
    expect(normalized.boards.second?.nextLayer.liveWidgets).toEqual([])
    expect(normalized.liveCards).not.toHaveProperty("orphan")
  })

  it("rejects old versions and structurally unsafe current data", () => {
    expect(() => normalizeApplicationData({ ...currentData, version: 11 })).toThrow("stored data must be preserved")
    expect(() => normalizeApplicationData({ ...currentData, boards: [] })).toThrow("entity maps")
  })
})
