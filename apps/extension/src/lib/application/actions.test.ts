import type { ApplicationData } from "./data"
import { describe, expect, it } from "vitest"
import { executeApplicationAction } from "./actions"

const dependencies = { createId: () => "new", now: () => 100 }

function createData(): ApplicationData {
  return {
    version: 2,
    collections: [{
      id: "reading",
      name: "Reading",
      createdAt: 1,
      instanceIds: ["rss:feed::one"],
      defaultLayer: "now",
      nowLayer: {
        color: "blue",
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

describe("application actions", () => {
  it("creates a Board with its NowLayer configuration", () => {
    const execution = executeApplicationAction(createData(), {
      type: "collection.create",
      input: {
        name: "  AI  ",
        board: { color: "purple", defaultLayer: "next", sortMode: "provider" },
      },
    }, dependencies)

    expect(execution.data.collections.at(-1)).toEqual({
      id: "new",
      name: "AI",
      createdAt: 100,
      instanceIds: [],
      defaultLayer: "next",
      nowLayer: {
        color: "purple",
        sort: { mode: "provider", automaticMode: "provider", manualOrder: [] },
      },
    })
  })

  it("adds new Instances to the front of membership order", () => {
    const execution = executeApplicationAction(createData(), {
      type: "instance.create",
      input: { collectionIds: ["reading"], sourceId: "github:trending", patch: {} },
    }, dependencies)

    expect(execution.data.collections[0]?.instanceIds).toEqual([
      "github:trending::new",
      "rss:feed::one",
    ])
    expect(execution.data.collections[0]?.nowLayer.sort.manualOrder).toEqual([
      "github:trending::new",
      "rss:feed::one",
    ])
  })

  it("does not reorder an existing membership when it is added again", () => {
    const initial = createData()
    initial.collections[0]!.instanceIds.unshift("rss:feed::two")
    initial.collections[0]!.nowLayer.sort.manualOrder.unshift("rss:feed::two")
    initial.instances.push({ instanceId: "rss:feed::two", sourceId: "rss:feed", patch: {}, createdAt: 2 })

    const execution = executeApplicationAction(initial, {
      type: "collection.addInstance",
      input: { collectionId: "reading", instanceId: "rss:feed::one" },
    }, dependencies)

    expect(execution.data.collections[0]).toBe(initial.collections[0])
  })

  it("stores manual order only in the NowLayer", () => {
    const initial = createData()
    initial.collections[0]!.instanceIds.unshift("rss:feed::two")
    initial.collections[0]!.nowLayer.sort.manualOrder.unshift("rss:feed::two")
    initial.instances.push({ instanceId: "rss:feed::two", sourceId: "rss:feed", patch: {}, createdAt: 2 })

    const execution = executeApplicationAction(initial, {
      type: "nowLayer.setManualOrder",
      input: { collectionId: "reading", instanceIds: ["rss:feed::one", "rss:feed::two"] },
    }, dependencies)

    expect(execution.data.collections[0]?.instanceIds).toEqual(["rss:feed::two", "rss:feed::one"])
    expect(execution.data.collections[0]?.nowLayer.sort).toMatchObject({
      mode: "manual",
      manualOrder: ["rss:feed::one", "rss:feed::two"],
    })
  })

  it("rejects a manual order that omits members", () => {
    expect(() => executeApplicationAction(createData(), {
      type: "nowLayer.setManualOrder",
      input: { collectionId: "reading", instanceIds: [] },
    }, dependencies)).toThrow("every Collection Instance")
  })

  it("removes an Instance and every membership", () => {
    const execution = executeApplicationAction(createData(), {
      type: "instance.delete",
      input: { instanceId: "rss:feed::one" },
    }, dependencies)

    expect(execution.data.instances).toEqual([])
    expect(execution.data.collections[0]?.instanceIds).toEqual([])
    expect(execution.data.collections[0]?.nowLayer.sort.manualOrder).toEqual([])
  })
})
