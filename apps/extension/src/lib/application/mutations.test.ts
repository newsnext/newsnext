import type { ApplicationData } from "./data"
import { describe, expect, it } from "vitest"
import {
  createBoardMutation,
  createInstanceMutation,
  deleteInstanceMutation,
  installNextLayerWidgetMutation,
  moveInstanceMutation,
  moveNextLayerWidgetMutation,
  resetInstanceMetadataMutation,
  setNextLayerWidgetDataScopeMutation,
  setNextLayerWidgetLayoutsMutation,
  setNextLayerWidgetMetadataMutation,
  setNextLayerWidgetParamsMutation,
  setNowLayerManualOrderMutation,
} from "./mutations"

const dependencies = { createId: () => "new", now: () => 100, workerId: "worker-a" }

function createData(): ApplicationData {
  return {
    version: 6,
    boards: [{
      color: "blue",
      id: "reading",
      name: "Reading",
      createdAt: 1,
      instanceIds: ["rss:feed::one"],
      defaultLayer: "now",
      nowLayer: {
        sort: { mode: "addedAt", automaticMode: "addedAt", manualOrder: ["rss:feed::one"] },
      },
      nextLayer: { widgets: [] },
    }],
    instances: [{
      instanceId: "rss:feed::one",
      workerId: "worker-a",
      sourceId: "rss:feed",
      patch: {},
      createdAt: 1,
    }],
  }
}

function createTargetBoard(instanceIds: string[] = []): ApplicationData["boards"][number] {
  return {
    color: "purple",
    id: "target",
    name: "Target",
    createdAt: 2,
    instanceIds,
    defaultLayer: "now",
    nowLayer: {
      sort: { mode: "addedAt", automaticMode: "addedAt", manualOrder: [...instanceIds] },
    },
    nextLayer: { widgets: [] },
  }
}

describe("application mutations", () => {
  it("moves a Widget atomically while retaining its size, metadata and parameters", () => {
    const data = createData()
    data.boards.push(createTargetBoard())
    const installed = installNextLayerWidgetMutation(data, {
      boardId: "reading",
      widgetId: "feed",
      dataScope: { type: "instances", instanceIds: ["rss:feed::one"] },
      layout: { x: 2, y: 4, width: 6, height: 3 },
    }).data
    const configured = setNextLayerWidgetMetadataMutation(setNextLayerWidgetParamsMutation(installed, {
      boardId: "reading",
      widgetId: "feed",
      params: { limit: 5 },
    }).data, { boardId: "reading", widgetId: "feed", metadata: { title: "My feed", color: "teal", desc: "Description", home: "https://example.com", badge: "https://example.com/badge.png" } }).data
    const moved = moveNextLayerWidgetMutation(configured, { boardId: "reading", targetBoardId: "target", widgetId: "feed" }).data
    expect(moved.boards[0]?.nextLayer.widgets).toEqual([])
    expect(moved.boards[1]?.nextLayer.widgets[0]).toEqual({
      ...configured.boards[0]?.nextLayer.widgets[0],
      layout: { x: 0, y: 0, width: 6, height: 3 },
      dataScope: { type: "instances", instanceIds: [] },
    })
    expect(configured.boards[0]?.nextLayer.widgets).toHaveLength(1)
    expect(moved.instances).toEqual(configured.instances)
    expect(moveNextLayerWidgetMutation(moved, { boardId: "target", targetBoardId: "target", widgetId: "feed" }).data).toBe(moved)
    const duplicate = installNextLayerWidgetMutation(moved, { boardId: "reading", widgetId: "feed", dataScope: { type: "board" }, layout: { x: 0, y: 0, width: 1, height: 1 } }).data
    expect(() => moveNextLayerWidgetMutation(duplicate, { boardId: "reading", targetBoardId: "target", widgetId: "feed" })).toThrow("already contains")
  })

  it("resets Card metadata without resetting its source parameters", () => {
    const data = createData()
    data.instances[0]!.patch = { metadata: { title: "Custom", color: "teal" }, params: { url: "https://example.com/feed" } }
    const reset = resetInstanceMetadataMutation(data, { instanceId: "rss:feed::one" }).data
    expect(reset.instances[0]?.patch).toEqual({ metadata: {}, params: data.instances[0]!.patch.params })
    expect(data.instances[0]?.patch.metadata?.title).toBe("Custom")
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
      instanceIds: [],
      defaultLayer: "next",
      nowLayer: {
        sort: { mode: "provider", automaticMode: "provider", manualOrder: [] },
      },
      nextLayer: { widgets: [] },
    })
  })

  it("adds new Instances to the front of their Board order", () => {
    const execution = createInstanceMutation(createData(), {
      boardId: "reading",
      sourceId: "github:trending",
      patch: {},
    }, dependencies)

    expect(execution.data.boards[0]?.instanceIds).toEqual([
      "new",
      "rss:feed::one",
    ])
    expect(execution.data.boards[0]?.nowLayer.sort.manualOrder).toEqual([
      "new",
      "rss:feed::one",
    ])
    expect(execution.data.instances.at(-1)?.workerId).toBe("worker-a")
  })

  it("does not reorder an Instance moved to its current Board", () => {
    const initial = createData()
    initial.boards[0]!.instanceIds.unshift("rss:feed::two")
    initial.boards[0]!.nowLayer.sort.manualOrder.unshift("rss:feed::two")
    initial.instances.push({ instanceId: "rss:feed::two", workerId: "worker-a", sourceId: "rss:feed", patch: {}, createdAt: 2 })

    const execution = moveInstanceMutation(initial, {
      boardId: "reading",
      instanceId: "rss:feed::one",
    })

    expect(execution.data.boards[0]).toBe(initial.boards[0])
  })

  it("moves an existing Instance to another Board", () => {
    const initial = createData()
    initial.boards.push(createTargetBoard())

    const execution = moveInstanceMutation(initial, {
      boardId: "target",
      instanceId: "rss:feed::one",
    })

    expect(execution.data.boards[0]?.instanceIds).toEqual([])
    expect(execution.data.boards[1]?.instanceIds).toEqual(["rss:feed::one"])
  })

  it("stores manual order only in the NowLayer", () => {
    const initial = createData()
    initial.boards[0]!.instanceIds.unshift("rss:feed::two")
    initial.boards[0]!.nowLayer.sort.manualOrder.unshift("rss:feed::two")
    initial.instances.push({ instanceId: "rss:feed::two", workerId: "worker-a", sourceId: "rss:feed", patch: {}, createdAt: 2 })

    const execution = setNowLayerManualOrderMutation(initial, {
      boardId: "reading",
      instanceIds: ["rss:feed::one", "rss:feed::two"],
    })

    expect(execution.data.boards[0]?.instanceIds).toEqual(["rss:feed::two", "rss:feed::one"])
    expect(execution.data.boards[0]?.nowLayer.sort).toMatchObject({
      mode: "manual",
      manualOrder: ["rss:feed::one", "rss:feed::two"],
    })
  })

  it("rejects a manual order that omits members", () => {
    expect(() => setNowLayerManualOrderMutation(createData(), {
      boardId: "reading",
      instanceIds: [],
    })).toThrow("every Board Instance")
  })

  it("removes an Instance from its Board", () => {
    const execution = deleteInstanceMutation(createData(), { instanceId: "rss:feed::one" })

    expect(execution.data.instances).toEqual([])
    expect(execution.data.boards[0]?.instanceIds).toEqual([])
    expect(execution.data.boards[0]?.nowLayer.sort.manualOrder).toEqual([])
  })

  it("installs a Board-scoped Widget and persists layout changes", () => {
    const installed = installNextLayerWidgetMutation(createData(), {
      boardId: "reading",
      dataScope: { type: "board" },
      layout: { x: 0, y: 0, width: 6, height: 4 },
      widgetId: "latest",
    }).data

    const execution = setNextLayerWidgetLayoutsMutation(installed, {
      boardId: "reading",
      widgets: [{
        widgetId: "latest",
        layout: { x: 2, y: 3, width: 8, height: 5 },
      }],
    })

    expect(execution.data.boards[0]?.nextLayer.widgets).toEqual([{
      widgetId: "latest",
      dataScope: { type: "board" },
      layout: { x: 2, y: 3, width: 8, height: 5 },
    }])
  })

  it("normalizes Widget metadata and resets it without changing parameters or placement", () => {
    const installed = installNextLayerWidgetMutation(createData(), {
      boardId: "reading",
      widgetId: "latest",
      dataScope: { type: "board" },
      layout: { x: 0, y: 0, width: 6, height: 4 },
    }).data
    const configured = setNextLayerWidgetParamsMutation(installed, {
      boardId: "reading",
      widgetId: "latest",
      params: { limit: 5 },
    }).data
    const saved = setNextLayerWidgetMetadataMutation(configured, {
      boardId: "reading",
      widgetId: "latest",
      metadata: { title: "  My feed  ", color: "teal" },
    }).data
    expect(saved.boards[0]?.nextLayer.widgets[0]).toEqual({
      ...configured.boards[0]?.nextLayer.widgets[0],
      metadata: { title: "My feed", color: "teal" },
    })
    expect(configured.boards[0]?.nextLayer.widgets[0]?.metadata).toBeUndefined()
    const reset = setNextLayerWidgetMetadataMutation(saved, {
      boardId: "reading",
      widgetId: "latest",
      metadata: { title: "  " },
    }).data
    expect(reset.boards[0]?.nextLayer.widgets[0]).toEqual({
      ...configured.boards[0]?.nextLayer.widgets[0],
      metadata: {},
    })
    expect(() => setNextLayerWidgetMetadataMutation(saved, {
      boardId: "reading",
      widgetId: "missing",
      metadata: {},
    })).toThrow()
  })

  it("replaces and resets Widget parameters without changing placement or other Boards", () => {
    const installed = installNextLayerWidgetMutation(createData(), {
      boardId: "reading",
      widgetId: "latest",
      dataScope: { type: "board" },
      layout: { x: 0, y: 0, width: 6, height: 4 },
    }).data
    const saved = setNextLayerWidgetParamsMutation(installed, {
      boardId: "reading",
      widgetId: "latest",
      params: { limit: 5, enabled: false },
    }).data
    expect(installed.boards[0]?.nextLayer.widgets[0]?.params).toBeUndefined()
    expect(saved.boards[0]?.nextLayer.widgets[0]).toEqual({
      ...installed.boards[0]?.nextLayer.widgets[0],
      params: { limit: 5, enabled: false },
    })
    expect(saved.boards.slice(1)).toEqual(installed.boards.slice(1))
    const reset = setNextLayerWidgetParamsMutation(saved, {
      boardId: "reading",
      widgetId: "latest",
      params: {},
    }).data
    expect(reset.boards[0]?.nextLayer.widgets[0]?.params).toEqual({})
    expect(() => setNextLayerWidgetParamsMutation(saved, {
      boardId: "reading",
      widgetId: "missing",
      params: {},
    })).toThrow()
  })

  it("limits explicit Widget data scopes to Board Instances", () => {
    const installed = installNextLayerWidgetMutation(createData(), {
      boardId: "reading",
      dataScope: { type: "instances", instanceIds: ["rss:feed::one"] },
      layout: { x: 0, y: 0, width: 6, height: 4 },
      widgetId: "latest",
    }).data

    expect(() => setNextLayerWidgetDataScopeMutation(installed, {
      boardId: "reading",
      dataScope: { type: "instances", instanceIds: ["outside"] },
      widgetId: "latest",
    })).toThrow("from its Board")

    const execution = deleteInstanceMutation(installed, { instanceId: "rss:feed::one" })
    expect(execution.data.boards[0]?.nextLayer.widgets[0]?.dataScope).toEqual({
      type: "instances",
      instanceIds: [],
    })
  })
})
