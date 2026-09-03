import type { ApplicationData } from "./data"
import { describe, expect, it } from "vitest"
import {
  addBoardInstanceMutation,
  createBoardMutation,
  createInstanceMutation,
  deleteInstanceMutation,
  installNextLayerWidgetMutation,
  setNextLayerWidgetDataScopeMutation,
  setNextLayerWidgetLayoutsMutation,
  setNowLayerManualOrderMutation,
} from "./mutations"

const dependencies = { createId: () => "new", now: () => 100, workerId: "worker-a" }

function createData(): ApplicationData {
  return {
    version: 5,
    boards: [{
      color: "blue",
      id: "reading",
      illustration: null,
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
    illustration: null,
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
      illustration: null,
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

  it("adds new Instances to the front of membership order", () => {
    const execution = createInstanceMutation(createData(), {
      boardIds: ["reading"],
      sourceId: "github:trending",
      patch: {},
    }, dependencies)

    expect(execution.data.boards[0]?.instanceIds).toEqual([
      "github:trending::new",
      "rss:feed::one",
    ])
    expect(execution.data.boards[0]?.nowLayer.sort.manualOrder).toEqual([
      "github:trending::new",
      "rss:feed::one",
    ])
    expect(execution.data.instances.at(-1)?.workerId).toBe("worker-a")
  })

  it("does not reorder an existing membership when it is added again", () => {
    const initial = createData()
    initial.boards[0]!.instanceIds.unshift("rss:feed::two")
    initial.boards[0]!.nowLayer.sort.manualOrder.unshift("rss:feed::two")
    initial.instances.push({ instanceId: "rss:feed::two", workerId: "worker-a", sourceId: "rss:feed", patch: {}, createdAt: 2 })

    const execution = addBoardInstanceMutation(initial, {
      boardId: "reading",
      instanceId: "rss:feed::one",
    })

    expect(execution.data.boards[0]).toBe(initial.boards[0])
  })

  it("moves an existing Instance when adding it to another Board", () => {
    const initial = createData()
    initial.boards.push(createTargetBoard())

    const execution = addBoardInstanceMutation(initial, {
      boardId: "target",
      instanceId: "rss:feed::one",
    })

    expect(execution.data.boards[0]?.instanceIds).toEqual([])
    expect(execution.data.boards[1]?.instanceIds).toEqual(["rss:feed::one"])
  })

  it("rejects creating an Instance in multiple Boards", () => {
    const initial = createData()
    initial.boards.push(createTargetBoard())

    expect(() => createInstanceMutation(initial, {
      boardIds: ["reading", "target"],
      sourceId: "github:trending",
      patch: {},
    }, dependencies)).toThrow("exactly one Board")
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

  it("removes an Instance and every membership", () => {
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
