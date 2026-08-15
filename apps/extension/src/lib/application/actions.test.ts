import type { ApplicationData } from "./data"
import { describe, expect, it } from "vitest"
import { executeApplicationAction } from "./actions"

const dependencies = {
  createId: () => "collection-new",
  now: () => 100,
}

function createData(): ApplicationData {
  return {
    collections: [{ id: "reading", name: "Reading", createdAt: 1 }],
    collectionViews: [{
      collectionId: "reading",
      defaultView: "now",
      sortMode: "createdAt",
      automaticSortMode: "createdAt",
    }],
    collectionEntries: [],
    instances: [{
      instanceId: "rss:feed::one",
      sourceId: "rss:feed",
      patch: {},
      createdAt: 1,
    }],
  }
}

describe("application actions", () => {
  it("creates Collection data and its human View preferences together", () => {
    const execution = executeApplicationAction(createData(), {
      type: "collection.create",
      input: {
        name: "  AI  ",
        view: { color: "purple", defaultView: "next", sortMode: "provider" },
      },
    }, dependencies)

    expect(execution.result).toEqual({ collectionId: "collection-new" })
    expect(execution.data.collections.at(-1)).toEqual({
      id: "collection-new",
      name: "AI",
      createdAt: 100,
    })
    expect(execution.data.collectionViews.at(-1)).toMatchObject({
      collectionId: "collection-new",
      color: "purple",
      defaultView: "next",
      sortMode: "provider",
    })
  })

  it("atomically updates Collection data and View preferences", () => {
    const configured = executeApplicationAction(createData(), {
      type: "collection.update",
      input: {
        collectionId: "reading",
        name: "Research",
        view: { color: "purple", defaultView: "next", sortMode: "provider" },
      },
    }, dependencies)

    expect(configured.data.collections[0]?.name).toBe("Research")
    expect(configured.data.collectionViews[0]).toMatchObject({
      color: "purple",
      defaultView: "next",
      sortMode: "provider",
      automaticSortMode: "provider",
    })
  })

  it("removes one membership without changing another Collection membership", () => {
    const initial = createData()
    initial.collections.push({ id: "ai", name: "AI", createdAt: 2 })
    initial.collectionViews.push({
      collectionId: "ai",
      defaultView: "now",
      sortMode: "createdAt",
      automaticSortMode: "createdAt",
    })
    initial.collectionEntries.push({
      collectionId: "reading",
      instanceId: "rss:feed::one",
      addedAt: 1,
      position: 0,
    })

    initial.collectionEntries.push({
      collectionId: "ai",
      instanceId: "rss:feed::one",
      addedAt: 2,
      position: 0,
    })

    const execution = executeApplicationAction(initial, {
      type: "collection.removeInstance",
      input: { collectionId: "reading", instanceId: "rss:feed::one" },
    }, dependencies)

    expect(execution.data.collectionEntries).toEqual([{
      collectionId: "ai",
      instanceId: "rss:feed::one",
      addedAt: 2,
      position: 0,
    }])
    expect(execution.data.instances[0]).not.toHaveProperty("collectionId")
  })

  it("deletes an Instance and every membership without deleting Collections", () => {
    const initial = createData()
    initial.collectionEntries.push({
      collectionId: "reading",
      instanceId: "rss:feed::one",
      addedAt: 1,
      position: 0,
    })
    const execution = executeApplicationAction(initial, {
      type: "instance.delete",
      input: { instanceId: "rss:feed::one" },
    }, dependencies)

    expect(execution.data.instances).toEqual([])
    expect(execution.data.collectionEntries).toEqual([])
    expect(execution.data.collections).toEqual(initial.collections)
  })

  it("deletes a Collection and its View and entries without deleting Instances", () => {
    const initial = createData()
    initial.collectionEntries.push({
      collectionId: "reading",
      instanceId: "rss:feed::one",
      addedAt: 1,
      position: 0,
    })
    const execution = executeApplicationAction(initial, {
      type: "collection.delete",
      input: { collectionId: "reading" },
    }, dependencies)

    expect(execution.data.collections).toEqual([])
    expect(execution.data.collectionViews).toEqual([])
    expect(execution.data.collectionEntries).toEqual([])
    expect(execution.data.instances).toEqual(initial.instances)
  })

  it("adds the same Instance to another Collection without changing existing membership", () => {
    const initial = createData()
    initial.collections.push({ id: "ai", name: "AI", createdAt: 2 })
    initial.collectionViews.push({
      collectionId: "ai",
      defaultView: "now",
      sortMode: "createdAt",
      automaticSortMode: "createdAt",
    })
    initial.collectionEntries.push({
      collectionId: "reading",
      instanceId: "rss:feed::one",
      addedAt: 1,
      position: 0,
    })

    const execution = executeApplicationAction(initial, {
      type: "collection.addInstance",
      input: { collectionId: "ai", instanceId: "rss:feed::one" },
    }, dependencies)

    expect(execution.data.collectionEntries.map(entry => entry.collectionId))
      .toEqual(["reading", "ai"])
  })

  it("creates an Instance and optional Collection membership atomically", () => {
    const execution = executeApplicationAction(createData(), {
      type: "instance.create",
      input: {
        collectionId: "reading",
        sourceId: "github:trending",
        patch: { params: { language: "typescript" } },
      },
    }, dependencies)

    expect(execution.result).toEqual({ instanceId: "github:trending::collection-new" })
    expect(execution.data.instances.at(-1)).toEqual({
      instanceId: "github:trending::collection-new",
      sourceId: "github:trending",
      patch: { params: { language: "typescript" } },
      createdAt: 100,
    })
    expect(execution.data.collectionEntries.at(-1)).toEqual({
      collectionId: "reading",
      instanceId: "github:trending::collection-new",
      addedAt: 100,
      position: 0,
    })
  })

  it("resets Instance parameters without removing metadata", () => {
    const initial = createData()
    initial.instances[0]!.patch = {
      params: { topic: "news" },
      metadata: { title: "News" },
    }
    const execution = executeApplicationAction(initial, {
      type: "instance.resetParams",
      input: { instanceId: "rss:feed::one" },
    }, dependencies)

    expect(execution.data.instances[0]?.patch).toEqual({
      params: {},
      metadata: { title: "News" },
    })
  })

  it("rejects a manual order that omits Collection members", () => {
    const initial = createData()
    initial.collectionEntries.push({
      collectionId: "reading",
      instanceId: "rss:feed::one",
      addedAt: 1,
      position: 0,
    })
    expect(() => executeApplicationAction(initial, {
      type: "collection.reorderInstances",
      input: { collectionId: "reading", instanceIds: [] },
    }, dependencies)).toThrow("every Collection Instance")
  })

  it("atomically reorders Collection entries and selects manual View sorting", () => {
    const initial = createData()
    initial.collectionEntries.push({
      collectionId: "reading",
      instanceId: "rss:feed::one",
      addedAt: 1,
      position: 0,
    })
    const execution = executeApplicationAction(initial, {
      type: "collection.reorderInstances",
      input: { collectionId: "reading", instanceIds: ["rss:feed::one"] },
    }, dependencies)

    expect(execution.data.collectionViews[0]?.sortMode).toBe("manual")
  })
})
