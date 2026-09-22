import type { ApplicationData } from "./data"
import { describe, expect, it } from "vitest"
import { configureLiveWidgetMutation, createBoardMutation, createLiveCardMutation, createLiveWidgetMutation, deleteBoardMutation, deleteLiveCardMutation, deleteLiveWidgetMutation, moveLiveCardMutation, moveLiveWidgetMutation, resetLiveCardMetadataMutation, resetLiveWidgetParamsMutation, setLiveWidgetLayoutsMutation, setNextLayerManualOrderMutation, setNowLayerManualOrderMutation } from "./mutations"

const dependencies = { createId: () => "new", now: () => 100, workerId: "worker-a" }

function createData(): ApplicationData {
  return {
    version: 8,
    boards: [{
      color: "blue",
      id: "reading",
      name: "Reading",
      createdAt: 1,
      nowLayer: { liveCards: ["rss:feed::one"] },
      layer: "now",
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

function createTargetBoard(liveCards: string[] = []): ApplicationData["boards"][number] {
  return {
    color: "purple",
    id: "target",
    name: "Target",
    createdAt: 2,
    nowLayer: { liveCards },
    layer: "now",
    nextLayer: { liveWidgets: [] },
  }
}

describe("application mutations", () => {
  it("rejects empty widths on installation and resizing while allowing half-card widths", () => {
    const input = {
      boardId: "reading",
      widgetId: "feed",
      dataScope: { type: "board" as const },
      size: { width: 0, height: 1 },
    }
    expect(() => createLiveWidgetMutation(createData(), input, { createId: () => "feed" })).toThrow("Widget layout is invalid")
    const installed = createLiveWidgetMutation(createData(), {
      ...input,
      size: { ...input.size, width: 1 },
    }, { createId: () => "feed" }).data
    expect(installed.boards[0]?.nextLayer.liveWidgets[0]?.layout.width).toBe(1)
    expect(() => setLiveWidgetLayoutsMutation(installed, {
      boardId: "reading",
      liveWidgets: [{ liveWidgetId: "feed", width: 0, height: 1 }],
    })).toThrow("Widget layout is invalid")
  })

  it("defaults omitted install size and prepends before existing Widgets", () => {
    const first = createLiveWidgetMutation(createData(), {
      boardId: "reading",
      widgetId: "feed",
      dataScope: { type: "board" },
      size: {},
    }, { createId: () => "first" }).data
    expect(first.boards[0]?.nextLayer.liveWidgets[0]?.layout).toEqual({ height: 2, width: 2 })
    const second = createLiveWidgetMutation(first, {
      boardId: "reading",
      widgetId: "feed",
      dataScope: { type: "board" },
      size: { width: 4, height: 3 },
    }, { createId: () => "second" }).data
    expect(second.boards[0]?.nextLayer.liveWidgets[0]?.layout).toEqual({ height: 3, width: 4 })
    expect(second.boards[0]?.nextLayer.liveWidgets.map(widget => widget.liveWidgetId)).toEqual(["second", "first"])
    expect(() => createLiveWidgetMutation(second, {
      boardId: "reading",
      widgetId: "feed",
      dataScope: { type: "board" },
      size: { width: 0 },
    }, { createId: () => "third" })).toThrow("Widget layout is invalid")
  })

  it("moves a Widget atomically while retaining its size, metadata and parameters", () => {
    const data = createData()
    data.boards.push(createTargetBoard())
    const installed = createLiveWidgetMutation(data, {
      boardId: "reading",
      widgetId: "feed",
      dataScope: { type: "cards", cardIds: ["rss:feed::one"] },
      size: { width: 6, height: 3 },
    }, { createId: () => "feed" }).data
    const configured = configureLiveWidgetMutation(installed, {
      liveWidgetId: "feed",
      patch: { params: { limit: 5 }, metadata: { title: "My feed", color: "teal", desc: "Description", home: "https://example.com", badge: "https://example.com/badge.png" } },
    }).data
    const moved = moveLiveWidgetMutation(configured, { liveWidgetId: "feed", boardId: "target" }).data
    expect(moved.boards[0]?.nextLayer.liveWidgets).toEqual([])
    expect(moved.boards[1]?.nextLayer.liveWidgets[0]).toEqual({
      ...configured.boards[0]?.nextLayer.liveWidgets[0],
      layout: { width: 6, height: 3 },
      dataScope: { type: "cards", cardIds: [] },
    })
    expect(configured.boards[0]?.nextLayer.liveWidgets).toHaveLength(1)
    expect(moved.liveCards).toEqual(configured.liveCards)
    expect(moveLiveWidgetMutation(moved, { liveWidgetId: "feed", boardId: "target" }).data).toBe(moved)
    const duplicate = createLiveWidgetMutation(moved, { boardId: "reading", widgetId: "feed", dataScope: { type: "board" }, size: { width: 2, height: 1 } }, { createId: () => "second-feed" }).data
    const together = moveLiveWidgetMutation(duplicate, { liveWidgetId: "second-feed", boardId: "target" }).data
    expect(together.boards[1]?.nextLayer.liveWidgets.map(widget => widget.liveWidgetId)).toEqual(["second-feed", "feed"])
  })

  it("resets Card metadata without resetting its source parameters", () => {
    const data = createData()
    data.liveCards[0]!.patch = { metadata: { title: "Custom" }, params: { url: "https://example.com/feed" } }
    const reset = resetLiveCardMetadataMutation(data, { cardId: "rss:feed::one" }).data
    expect(reset.liveCards[0]?.patch).toEqual({ metadata: {}, params: data.liveCards[0]!.patch.params })
    expect(data.liveCards[0]?.patch.metadata?.title).toBe("Custom")
  })

  it("creates a Board with its layer configuration", () => {
    const execution = createBoardMutation(createData(), {
      name: "  AI  ",
      color: "purple",
      layer: "next",
    }, dependencies)

    expect(execution.data.boards.at(-1)).toEqual({
      color: "purple",
      id: "new",
      name: "AI",
      createdAt: 100,
      nowLayer: { liveCards: [] },
      layer: "next",
      nextLayer: { liveWidgets: [] },
    })
  })

  it("transfers a deleted Board's LiveCards and Widgets to the target Board", () => {
    const data = createData()
    data.boards.push(createTargetBoard(["target-card"]))
    data.liveCards.push({ cardId: "target-card", workerId: "worker-a", sourceId: "target", patch: {}, createdAt: 2 })
    const withSourceWidget = createLiveWidgetMutation(data, {
      boardId: "reading",
      widgetId: "feed",
      dataScope: { type: "cards", cardIds: ["rss:feed::one"] },
      size: {},
    }, { createId: () => "source-widget" }).data
    const withBothWidgets = createLiveWidgetMutation(withSourceWidget, {
      boardId: "target",
      widgetId: "feed",
      dataScope: { type: "board" },
      size: {},
    }, { createId: () => "target-widget" }).data

    const execution = deleteBoardMutation(withBothWidgets, {
      boardId: "reading",
      targetBoardId: "target",
    })

    expect(execution.data.boards).toHaveLength(1)
    expect(execution.data.boards[0]?.nowLayer.liveCards).toEqual(["rss:feed::one", "target-card"])
    expect(execution.data.boards[0]?.nextLayer.liveWidgets.map(widget => widget.liveWidgetId)).toEqual([
      "source-widget",
      "target-widget",
    ])
    expect(execution.data.liveCards).toEqual(withBothWidgets.liveCards)
  })

  it("adds new LiveCards to the front of their Board order", () => {
    const execution = createLiveCardMutation(createData(), {
      boardId: "reading",
      sourceId: "github:trending",
      patch: {},
    }, dependencies)

    expect(execution.data.boards[0]?.nowLayer.liveCards).toEqual([
      "new",
      "rss:feed::one",
    ])
    expect(execution.data.liveCards.at(-1)?.workerId).toBe("worker-a")
  })

  it("does not reorder an LiveCard moved to its current Board", () => {
    const initial = createData()
    initial.boards[0]!.nowLayer.liveCards.unshift("rss:feed::two")
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

    expect(execution.data.boards[0]?.nowLayer.liveCards).toEqual([])
    expect(execution.data.boards[1]?.nowLayer.liveCards).toEqual(["rss:feed::one"])
  })

  it("rewrites Board card order from the NowLayer manual order", () => {
    const initial = createData()
    initial.boards[0]!.nowLayer.liveCards.unshift("rss:feed::two")
    initial.liveCards.push({ cardId: "rss:feed::two", workerId: "worker-a", sourceId: "rss:feed", patch: {}, createdAt: 2 })

    const execution = setNowLayerManualOrderMutation(initial, {
      boardId: "reading",
      liveCards: ["rss:feed::one", "rss:feed::two"],
    })

    expect(execution.data.boards[0]?.nowLayer.liveCards).toEqual(["rss:feed::one", "rss:feed::two"])
  })

  it("reorders Widgets from the NextLayer manual order", () => {
    const first = createLiveWidgetMutation(createData(), {
      boardId: "reading",
      dataScope: { type: "board" },
      size: { width: 2, height: 2 },
      widgetId: "feed",
    }, { createId: () => "first" }).data
    const second = createLiveWidgetMutation(first, {
      boardId: "reading",
      dataScope: { type: "board" },
      size: { width: 2, height: 2 },
      widgetId: "feed",
    }, { createId: () => "second" }).data
    expect(second.boards[0]?.nextLayer.liveWidgets.map(widget => widget.liveWidgetId)).toEqual(["second", "first"])
    const execution = setNextLayerManualOrderMutation(second, {
      boardId: "reading",
      widgetIds: ["first", "second"],
    })
    expect(execution.data.boards[0]?.nextLayer.liveWidgets.map(widget => widget.liveWidgetId)).toEqual(["first", "second"])
    expect(() => setNextLayerManualOrderMutation(second, {
      boardId: "reading",
      widgetIds: ["first"],
    })).toThrow("every Board Widget")
  })

  it("rejects a manual order that omits members", () => {
    expect(() => setNowLayerManualOrderMutation(createData(), {
      boardId: "reading",
      liveCards: [],
    })).toThrow("every Board LiveCard")
  })

  it("removes an LiveCard from its Board", () => {
    const execution = deleteLiveCardMutation(createData(), { cardId: "rss:feed::one" })

    expect(execution.data.liveCards).toEqual([])
    expect(execution.data.boards[0]?.nowLayer.liveCards).toEqual([])
  })

  it("installs a Board-scoped Widget and persists layout changes", () => {
    const installed = createLiveWidgetMutation(createData(), {
      boardId: "reading",
      dataScope: { type: "board" },
      size: { width: 6, height: 4 },
      widgetId: "latest",
    }, { createId: () => "latest" }).data

    const execution = setLiveWidgetLayoutsMutation(installed, {
      boardId: "reading",
      liveWidgets: [{
        liveWidgetId: "latest",
        width: 8,
        height: 5,
      }],
    })

    expect(execution.data.boards[0]?.nextLayer.liveWidgets).toEqual([{
      widgetId: "latest",
      liveWidgetId: "latest",
      dataScope: { type: "board" },
      layout: { width: 8, height: 5 },
    }])
  })

  it("reorders Widgets through the layout update in display order", () => {
    const first = createLiveWidgetMutation(createData(), {
      boardId: "reading",
      dataScope: { type: "board" },
      size: { width: 2, height: 2 },
      widgetId: "feed",
    }, { createId: () => "first" }).data
    const second = createLiveWidgetMutation(first, {
      boardId: "reading",
      dataScope: { type: "board" },
      size: { width: 2, height: 2 },
      widgetId: "feed",
    }, { createId: () => "second" }).data
    const reordered = setLiveWidgetLayoutsMutation(second, {
      boardId: "reading",
      liveWidgets: [
        { liveWidgetId: "second", width: 2, height: 2 },
        { liveWidgetId: "first", width: 2, height: 2 },
      ],
    }).data
    expect(reordered.boards[0]?.nextLayer.liveWidgets.map(widget => widget.liveWidgetId))
      .toEqual(["second", "first"])
    expect(() => setLiveWidgetLayoutsMutation(second, {
      boardId: "reading",
      liveWidgets: [{ liveWidgetId: "first", width: 2, height: 2 }],
    })).toThrow("exactly once")
  })

  it("normalizes Widget metadata and resets it without changing parameters or placement", () => {
    const installed = createLiveWidgetMutation(createData(), {
      boardId: "reading",
      widgetId: "latest",
      dataScope: { type: "board" },
      size: { width: 6, height: 4 },
    }, { createId: () => "latest" }).data
    const configured = configureLiveWidgetMutation(installed, {
      liveWidgetId: "latest",
      patch: { params: { limit: 5 } },
    }).data
    const saved = configureLiveWidgetMutation(configured, {
      liveWidgetId: "latest",
      patch: { metadata: { title: "  My feed  ", color: "teal" } },
    }).data
    expect(saved.boards[0]?.nextLayer.liveWidgets[0]).toEqual({
      ...configured.boards[0]?.nextLayer.liveWidgets[0],
      patch: { ...configured.boards[0]?.nextLayer.liveWidgets[0]?.patch, metadata: { title: "My feed", color: "teal" } },
    })
    expect(configured.boards[0]?.nextLayer.liveWidgets[0]?.patch?.metadata).toBeUndefined()
    const reset = configureLiveWidgetMutation(saved, {
      liveWidgetId: "latest",
      patch: { metadata: { title: "  " } },
    }).data
    expect(reset.boards[0]?.nextLayer.liveWidgets[0]).toEqual({
      ...configured.boards[0]?.nextLayer.liveWidgets[0],
      patch: { ...configured.boards[0]?.nextLayer.liveWidgets[0]?.patch, metadata: { color: "teal" } },
    })
    expect(() => configureLiveWidgetMutation(saved, {
      liveWidgetId: "missing",
      patch: { metadata: {} },
    })).toThrow()
  })

  it("replaces and resets Widget parameters without changing placement or other Boards", () => {
    const installed = createLiveWidgetMutation(createData(), {
      boardId: "reading",
      widgetId: "latest",
      dataScope: { type: "board" },
      size: { width: 6, height: 4 },
    }, { createId: () => "latest" }).data
    const saved = configureLiveWidgetMutation(installed, {
      liveWidgetId: "latest",
      patch: { params: { limit: 5, enabled: false } },
    }).data
    expect(installed.boards[0]?.nextLayer.liveWidgets[0]?.patch?.params).toBeUndefined()
    expect(saved.boards[0]?.nextLayer.liveWidgets[0]).toEqual({
      ...installed.boards[0]?.nextLayer.liveWidgets[0],
      patch: { params: { limit: 5, enabled: false } },
    })
    expect(saved.boards.slice(1)).toEqual(installed.boards.slice(1))
    const reset = resetLiveWidgetParamsMutation(saved, {
      liveWidgetId: "latest",
    }).data
    expect(reset.boards[0]?.nextLayer.liveWidgets[0]?.patch?.params).toEqual({})
    expect(() => configureLiveWidgetMutation(saved, {
      liveWidgetId: "missing",
      patch: { params: {} },
    })).toThrow()
  })

  it("limits explicit Widget data scopes to Board LiveCards", () => {
    const installed = createLiveWidgetMutation(createData(), {
      boardId: "reading",
      dataScope: { type: "cards", cardIds: ["rss:feed::one"] },
      size: { width: 6, height: 4 },
      widgetId: "latest",
    }, { createId: () => "latest" }).data

    expect(() => configureLiveWidgetMutation(installed, {
      liveWidgetId: "latest",
      patch: { dataScope: { type: "cards", cardIds: ["outside"] } },
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
    const installed = createLiveWidgetMutation(createData(), { boardId: "reading", widgetId: "chart", dataScope: { type: "board" }, size: { width: 2, height: 2 } }, { createId: () => "chart" }).data
    const first = configureLiveWidgetMutation(installed, { liveWidgetId: "chart", patch: { params: { enabled: false, count: 0 }, metadata: { title: "Chart" } } }).data
    const second = configureLiveWidgetMutation(first, { liveWidgetId: "chart", patch: { metadata: { title: "Updated" } } }).data
    expect(second.boards[0]?.nextLayer.liveWidgets[0]?.patch).toEqual({ params: { enabled: false, count: 0 }, metadata: { title: "Updated" } })
    const reset = configureLiveWidgetMutation(second, { liveWidgetId: "chart", patch: { metadata: null } }).data
    expect(reset.boards[0]?.nextLayer.liveWidgets[0]?.patch).toEqual({ params: { enabled: false, count: 0 } })
  })
})

it("creates independent instances from one definition and targets edits by instance ID", () => {
  const input = { boardId: "reading", widgetId: "shared", dataScope: { type: "board" as const }, size: { width: 2, height: 2 } }
  const first = createLiveWidgetMutation(createData(), input, { createId: () => "instance-a" })
  const second = createLiveWidgetMutation(first.data, input, { createId: () => "instance-b" })
  expect(first.result).toEqual({ liveWidgetId: "instance-a" })
  expect(second.result).toEqual({ liveWidgetId: "instance-b" })
  const edited = configureLiveWidgetMutation(second.data, { liveWidgetId: "instance-b", patch: { params: { limit: 5 }, metadata: { title: "Second" } } }).data
  expect(edited.boards[0]?.nextLayer.liveWidgets[0]?.patch?.params).toEqual({ limit: 5 })
  expect(edited.boards[0]?.nextLayer.liveWidgets[1]?.patch).toBeUndefined()
  const resized = setLiveWidgetLayoutsMutation(edited, { boardId: "reading", liveWidgets: [{ liveWidgetId: "instance-b", width: 2, height: 2 }, { liveWidgetId: "instance-a", width: 4, height: 3 }] }).data
  expect(resized.boards[0]?.nextLayer.liveWidgets[0]?.layout).toEqual({ ...input.size })
  expect(resized.boards[0]?.nextLayer.liveWidgets[1]?.layout).toEqual({ width: 4, height: 3 })
  const removed = deleteLiveWidgetMutation(resized, { liveWidgetId: "instance-b" }).data
  expect(removed.boards[0]?.nextLayer.liveWidgets.map(widget => widget.liveWidgetId)).toEqual(["instance-a"])
  expect(() => deleteLiveWidgetMutation(removed, { liveWidgetId: "shared" })).toThrow()
  expect(() => createLiveWidgetMutation(removed, input, { createId: () => "instance-a" })).toThrow("unique")
})
