import type { ApplicationData } from "./data"
import { describe, expect, it } from "vitest"
import {
  addBoardInstanceMutation,
  createBoardMutation,
  createInstanceMutation,
  deleteInstanceMutation,
  setNowLayerManualOrderMutation,
} from "./mutations"

const dependencies = { createId: () => "new", now: () => 100 }

function createData(): ApplicationData {
  return {
    version: 3,
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
    }],
    instances: [{
      instanceId: "rss:feed::one",
      sourceId: "rss:feed",
      patch: {},
      createdAt: 1,
    }],
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
      name: "AI",
      createdAt: 100,
      instanceIds: [],
      defaultLayer: "next",
      nowLayer: {
        sort: { mode: "provider", automaticMode: "provider", manualOrder: [] },
      },
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
  })

  it("does not reorder an existing membership when it is added again", () => {
    const initial = createData()
    initial.boards[0]!.instanceIds.unshift("rss:feed::two")
    initial.boards[0]!.nowLayer.sort.manualOrder.unshift("rss:feed::two")
    initial.instances.push({ instanceId: "rss:feed::two", sourceId: "rss:feed", patch: {}, createdAt: 2 })

    const execution = addBoardInstanceMutation(initial, {
      boardId: "reading",
      instanceId: "rss:feed::one",
    })

    expect(execution.data.boards[0]).toBe(initial.boards[0])
  })

  it("stores manual order only in the NowLayer", () => {
    const initial = createData()
    initial.boards[0]!.instanceIds.unshift("rss:feed::two")
    initial.boards[0]!.nowLayer.sort.manualOrder.unshift("rss:feed::two")
    initial.instances.push({ instanceId: "rss:feed::two", sourceId: "rss:feed", patch: {}, createdAt: 2 })

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
})
