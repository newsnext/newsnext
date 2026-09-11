import type { ApplicationData } from "./data"
import { describe, expect, it } from "vitest"
import { configureLiveWidgetMutation, createBoardMutation, createLiveCardMutation, deleteLiveCardMutation, installLiveWidgetMutation, moveLiveCardMutation, moveLiveWidgetMutation, resetLiveCardMetadataMutation, setLiveWidgetDataScopeMutation, setLiveWidgetLayoutsMutation, setLiveWidgetMetadataMutation, setLiveWidgetParamsMutation, setNowLayerManualOrderMutation } from "./mutations"

const dependencies = { createId: () => "new", now: () => 100, workerId: "worker-a" }

function createData(): ApplicationData {
  return {
    version: 7,
    boards: [{
      color: "blue",
      id: "reading",
      name: "Reading",
      createdAt: 1,
      cardIds: ["rss:feed::one"],
      defaultLayer: "now",
      nowLayer: {
        sort: { mode: "addedAt", automaticMode: "addedAt", manualOrder: ["rss:feed::one"] },
      },
      nextLayer: { liveWidgets: [] },
    }],
    liveCards: [{
      cardId: "rss:feed::one",
      workerId: "worker-a",
      sourceId: "rss:feed",
      patch: {},
      createdAt: 1,
    }],
  }
}

function createTargetBoard(cardIds: string[] = []): ApplicationData["boards"][number] {
  return {
    color: "purple",
    id: "target",
    name: "Target",
    createdAt: 2,
    cardIds,
    defaultLayer: "now",
    nowLayer: {
      sort: { mode: "addedAt", automaticMode: "addedAt", manualOrder: [...cardIds] },
    },
    nextLayer: { liveWidgets: [] },
  }
}

describe("application mutations", () => {
  it("moves a Widget atomically while retaining its size, metadata and parameters", () => {
    const data = createData()
    data.boards.push(createTargetBoard())
    const installed = installLiveWidgetMutation(data, {
      boardId: "reading",
      widgetId: "feed",
      dataScope: { type: "cards", cardIds: ["rss:feed::one"] },
      layout: { x: 2, y: 4, width: 6, height: 3 },
    }).data
    const configured = setLiveWidgetMetadataMutation(setLiveWidgetParamsMutation(installed, {
      boardId: "reading",
      widgetId: "feed",
      params: { limit: 5 },
    }).data, { boardId: "reading", widgetId: "feed", metadata: { title: "My feed", color: "teal", desc: "Description", home: "https://example.com", badge: "https://example.com/badge.png" } }).data
    const moved = moveLiveWidgetMutation(configured, { boardId: "reading", targetBoardId: "target", widgetId: "feed" }).data
    expect(moved.boards[0]?.nextLayer.liveWidgets).toEqual([])
    expect(moved.boards[1]?.nextLayer.liveWidgets[0]).toEqual({
      ...configured.boards[0]?.nextLayer.liveWidgets[0],
      layout: { x: 0, y: 0, width: 6, height: 3 },
      dataScope: { type: "cards", cardIds: [] },
    })
    expect(configured.boards[0]?.nextLayer.liveWidgets).toHaveLength(1)
    expect(moved.liveCards).toEqual(configured.liveCards)
    expect(moveLiveWidgetMutation(moved, { boardId: "target", targetBoardId: "target", widgetId: "feed" }).data).toBe(moved)
    const duplicate = installLiveWidgetMutation(moved, { boardId: "reading", widgetId: "feed", dataScope: { type: "board" }, layout: { x: 0, y: 0, width: 1, height: 1 } }).data
    expect(() => moveLiveWidgetMutation(duplicate, { boardId: "reading", targetBoardId: "target", widgetId: "feed" })).toThrow("already contains")
  })

  it("resets Card metadata without resetting its source parameters", () => {
    const data = createData()
    data.liveCards[0]!.patch = { metadata: { title: "Custom", color: "teal" }, params: { url: "https://example.com/feed" } }
    const reset = resetLiveCardMetadataMutation(data, { cardId: "rss:feed::one" }).data
    expect(reset.liveCards[0]?.patch).toEqual({ metadata: {}, params: data.liveCards[0]!.patch.params })
    expect(data.liveCards[0]?.patch.metadata?.title).toBe("Custom")
  })

  it("creates a Board with its NowLayer configuration", () => {
    const execution = createBoardMutation(createData(), {
      name: "  AI  ",
      color: "purple",
      defaultLayer: "next",
      sortMode: "provider",
    }, dependencies)

    expect(execution.data.boards.at(-1)).toEqual({
      color: "purple",
      id: "new",
      name: "AI",
      createdAt: 100,
      cardIds: [],
      defaultLayer: "next",
      nowLayer: {
        sort: { mode: "provider", automaticMode: "provider", manualOrder: [] },
      },
      nextLayer: { liveWidgets: [] },
    })
  })

  it("adds new LiveCards to the front of their Board order", () => {
    const execution = createLiveCardMutation(createData(), {
      boardId: "reading",
      sourceId: "github:trending",
      patch: {},
    }, dependencies)

    expect(execution.data.boards[0]?.cardIds).toEqual([
      "new",
      "rss:feed::one",
    ])
    expect(execution.data.boards[0]?.nowLayer.sort.manualOrder).toEqual([
      "new",
      "rss:feed::one",
    ])
    expect(execution.data.liveCards.at(-1)?.workerId).toBe("worker-a")
  })

  it("does not reorder an LiveCard moved to its current Board", () => {
    const initial = createData()
    initial.boards[0]!.cardIds.unshift("rss:feed::two")
    initial.boards[0]!.nowLayer.sort.manualOrder.unshift("rss:feed::two")
    initial.liveCards.push({ cardId: "rss:feed::two", workerId: "worker-a", sourceId: "rss:feed", patch: {}, createdAt: 2 })

    const execution = moveLiveCardMutation(initial, {
      boardId: "reading",
      cardId: "rss:feed::one",
    })

    expect(execution.data.boards[0]).toBe(initial.boards[0])
  })

  it("moves an existing LiveCard to another Board", () => {
    const initial = createData()
    initial.boards.push(createTargetBoard())

    const execution = moveLiveCardMutation(initial, {
      boardId: "target",
      cardId: "rss:feed::one",
    })

    expect(execution.data.boards[0]?.cardIds).toEqual([])
    expect(execution.data.boards[1]?.cardIds).toEqual(["rss:feed::one"])
  })

  it("stores manual order only in the NowLayer", () => {
    const initial = createData()
    initial.boards[0]!.cardIds.unshift("rss:feed::two")
    initial.boards[0]!.nowLayer.sort.manualOrder.unshift("rss:feed::two")
    initial.liveCards.push({ cardId: "rss:feed::two", workerId: "worker-a", sourceId: "rss:feed", patch: {}, createdAt: 2 })

    const execution = setNowLayerManualOrderMutation(initial, {
      boardId: "reading",
      cardIds: ["rss:feed::one", "rss:feed::two"],
    })

    expect(execution.data.boards[0]?.cardIds).toEqual(["rss:feed::two", "rss:feed::one"])
    expect(execution.data.boards[0]?.nowLayer.sort).toMatchObject({
      mode: "manual",
      manualOrder: ["rss:feed::one", "rss:feed::two"],
    })
  })

  it("rejects a manual order that omits members", () => {
    expect(() => setNowLayerManualOrderMutation(createData(), {
      boardId: "reading",
      cardIds: [],
    })).toThrow("every Board LiveCard")
  })

  it("removes an LiveCard from its Board", () => {
    const execution = deleteLiveCardMutation(createData(), { cardId: "rss:feed::one" })

    expect(execution.data.liveCards).toEqual([])
    expect(execution.data.boards[0]?.cardIds).toEqual([])
    expect(execution.data.boards[0]?.nowLayer.sort.manualOrder).toEqual([])
  })

  it("installs a Board-scoped Widget and persists layout changes", () => {
    const installed = installLiveWidgetMutation(createData(), {
      boardId: "reading",
      dataScope: { type: "board" },
      layout: { x: 0, y: 0, width: 6, height: 4 },
      widgetId: "latest",
    }).data

    const execution = setLiveWidgetLayoutsMutation(installed, {
      boardId: "reading",
      liveWidgets: [{
        widgetId: "latest",
        layout: { x: 2, y: 3, width: 8, height: 5 },
      }],
    })

    expect(execution.data.boards[0]?.nextLayer.liveWidgets).toEqual([{
      widgetId: "latest",
      dataScope: { type: "board" },
      layout: { x: 2, y: 3, width: 8, height: 5 },
    }])
  })

  it("normalizes Widget metadata and resets it without changing parameters or placement", () => {
    const installed = installLiveWidgetMutation(createData(), {
      boardId: "reading",
      widgetId: "latest",
      dataScope: { type: "board" },
      layout: { x: 0, y: 0, width: 6, height: 4 },
    }).data
    const configured = setLiveWidgetParamsMutation(installed, {
      boardId: "reading",
      widgetId: "latest",
      params: { limit: 5 },
    }).data
    const saved = setLiveWidgetMetadataMutation(configured, {
      boardId: "reading",
      widgetId: "latest",
      metadata: { title: "  My feed  ", color: "teal" },
    }).data
    expect(saved.boards[0]?.nextLayer.liveWidgets[0]).toEqual({
      ...configured.boards[0]?.nextLayer.liveWidgets[0],
      patch: { ...configured.boards[0]?.nextLayer.liveWidgets[0]?.patch, metadata: { title: "My feed", color: "teal" } },
    })
    expect(configured.boards[0]?.nextLayer.liveWidgets[0]?.patch?.metadata).toBeUndefined()
    const reset = setLiveWidgetMetadataMutation(saved, {
      boardId: "reading",
      widgetId: "latest",
      metadata: { title: "  " },
    }).data
    expect(reset.boards[0]?.nextLayer.liveWidgets[0]).toEqual({
      ...configured.boards[0]?.nextLayer.liveWidgets[0],
      patch: { ...configured.boards[0]?.nextLayer.liveWidgets[0]?.patch, metadata: {} },
    })
    expect(() => setLiveWidgetMetadataMutation(saved, {
      boardId: "reading",
      widgetId: "missing",
      metadata: {},
    })).toThrow()
  })

  it("replaces and resets Widget parameters without changing placement or other Boards", () => {
    const installed = installLiveWidgetMutation(createData(), {
      boardId: "reading",
      widgetId: "latest",
      dataScope: { type: "board" },
      layout: { x: 0, y: 0, width: 6, height: 4 },
    }).data
    const saved = setLiveWidgetParamsMutation(installed, {
      boardId: "reading",
      widgetId: "latest",
      params: { limit: 5, enabled: false },
    }).data
    expect(installed.boards[0]?.nextLayer.liveWidgets[0]?.patch?.params).toBeUndefined()
    expect(saved.boards[0]?.nextLayer.liveWidgets[0]).toEqual({
      ...installed.boards[0]?.nextLayer.liveWidgets[0],
      patch: { params: { limit: 5, enabled: false } },
    })
    expect(saved.boards.slice(1)).toEqual(installed.boards.slice(1))
    const reset = setLiveWidgetParamsMutation(saved, {
      boardId: "reading",
      widgetId: "latest",
      params: {},
    }).data
    expect(reset.boards[0]?.nextLayer.liveWidgets[0]?.patch?.params).toEqual({})
    expect(() => setLiveWidgetParamsMutation(saved, {
      boardId: "reading",
      widgetId: "missing",
      params: {},
    })).toThrow()
  })

  it("limits explicit Widget data scopes to Board LiveCards", () => {
    const installed = installLiveWidgetMutation(createData(), {
      boardId: "reading",
      dataScope: { type: "cards", cardIds: ["rss:feed::one"] },
      layout: { x: 0, y: 0, width: 6, height: 4 },
      widgetId: "latest",
    }).data

    expect(() => setLiveWidgetDataScopeMutation(installed, {
      boardId: "reading",
      dataScope: { type: "cards", cardIds: ["outside"] },
      widgetId: "latest",
    })).toThrow("from its Board")

    const execution = deleteLiveCardMutation(installed, { cardId: "rss:feed::one" })
    expect(execution.data.boards[0]?.nextLayer.liveWidgets[0]?.dataScope).toEqual({
      type: "cards",
      cardIds: [],
    })
  })
})

describe("widget patches", () => {
  it("merges sparse sections, preserves falsy values and resets only the requested section", () => {
    const installed = installLiveWidgetMutation(createData(), { boardId: "reading", widgetId: "chart", dataScope: { type: "board" }, layout: { x: 0, y: 0, width: 2, height: 2 } }).data
    const first = configureLiveWidgetMutation(installed, { boardId: "reading", widgetId: "chart", patch: { params: { enabled: false, count: 0 }, metadata: { title: "Chart" }, view: { chart: "line", limit: 10 } } }).data
    const second = configureLiveWidgetMutation(first, { boardId: "reading", widgetId: "chart", patch: { view: { chart: "bar" } } }).data
    expect(second.boards[0]?.nextLayer.liveWidgets[0]?.patch).toEqual({ params: { enabled: false, count: 0 }, metadata: { title: "Chart" }, view: { chart: "bar", limit: 10 } })
    const reset = configureLiveWidgetMutation(second, { boardId: "reading", widgetId: "chart", patch: { view: null } }).data
    expect(reset.boards[0]?.nextLayer.liveWidgets[0]?.patch).toEqual({ params: { enabled: false, count: 0 }, metadata: { title: "Chart" } })
    expect(first.boards[0]?.nextLayer.liveWidgets[0]?.patch?.view?.chart).toBe("line")
    expect(() => configureLiveWidgetMutation(first, { boardId: "reading", widgetId: "chart", patch: { view: { limit: 0 } } })).toThrow()
  })
})
