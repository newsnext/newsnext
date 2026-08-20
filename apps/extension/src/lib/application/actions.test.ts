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
      defaultLayer: "now",
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
        view: { color: "purple", defaultLayer: "next", sortMode: "provider" },
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
      defaultLayer: "next",
      sortMode: "provider",
    })
  })

  it("allows Collections to share a display name", () => {
    const execution = executeApplicationAction(createData(), {
      type: "collection.create",
      input: { name: "Reading" },
    }, dependencies)

    expect(execution.data.collections.map(collection => collection.name))
      .toEqual(["Reading", "Reading"])
  })

  it("creates a Collection with configured Instances and memberships atomically", () => {
    let id = 0
    const execution = executeApplicationAction(createData(), {
      type: "collection.create",
      input: {
        name: "Subscriptions",
        instances: [
          {
            sourceId: "rss:feed",
            patch: { params: { url: "https://example.com/feed.xml" } },
          },
          {
            sourceId: "rss:feed",
            patch: {
              params: { url: "https://example.org/rss" },
              metadata: { title: "Example News" },
            },
          },
        ],
      },
    }, {
      createId: () => `new-${++id}`,
      now: () => 100,
    })

    expect(execution.result).toEqual({ collectionId: "new-1" })
    expect(execution.data.instances.slice(-2)).toEqual([
      {
        instanceId: "rss:feed::new-2",
        sourceId: "rss:feed",
        patch: { params: { url: "https://example.com/feed.xml" } },
        createdAt: 100,
      },
      {
        instanceId: "rss:feed::new-3",
        sourceId: "rss:feed",
        patch: {
          params: { url: "https://example.org/rss" },
          metadata: { title: "Example News" },
        },
        createdAt: 100,
      },
    ])
    expect(execution.data.collectionEntries).toEqual([
      { collectionId: "new-1", instanceId: "rss:feed::new-2", addedAt: 100, position: 0 },
      { collectionId: "new-1", instanceId: "rss:feed::new-3", addedAt: 100, position: 1 },
    ])
  })

  it("atomically updates Collection data and View preferences", () => {
    const configured = executeApplicationAction(createData(), {
      type: "collection.update",
      input: {
        collectionId: "reading",
        name: "Research",
        view: { color: "purple", defaultLayer: "next", sortMode: "provider" },
      },
    }, dependencies)

    expect(configured.data.collections[0]?.name).toBe("Research")
    expect(configured.data.collectionViews[0]).toMatchObject({
      color: "purple",
      defaultLayer: "next",
      sortMode: "provider",
      automaticSortMode: "provider",
    })
  })

  it("removes one membership without changing another Collection membership", () => {
    const initial = createData()
    initial.collections.push({ id: "ai", name: "AI", createdAt: 2 })
    initial.collectionViews.push({
      collectionId: "ai",
      defaultLayer: "now",
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

  it("deletes only Collection Instances not used by another Collection", () => {
    const initial = createData()
    initial.collections.push({ id: "ai", name: "AI", createdAt: 2 })
    initial.collectionViews.push({
      collectionId: "ai",
      defaultLayer: "now",
      sortMode: "createdAt",
      automaticSortMode: "createdAt",
    })
    initial.instances.push({
      instanceId: "rss:feed::two",
      sourceId: "rss:feed",
      patch: {},
      createdAt: 2,
    })
    initial.instances.push({
      instanceId: "rss:feed::three",
      sourceId: "rss:feed",
      patch: {},
      createdAt: 3,
    })
    initial.collectionEntries.push(
      { collectionId: "reading", instanceId: "rss:feed::one", addedAt: 1, position: 0 },
      { collectionId: "ai", instanceId: "rss:feed::one", addedAt: 2, position: 0 },
      { collectionId: "ai", instanceId: "rss:feed::two", addedAt: 3, position: 1 },
      { collectionId: "reading", instanceId: "rss:feed::three", addedAt: 4, position: 1 },
    )

    const execution = executeApplicationAction(initial, {
      type: "collection.delete",
      input: { collectionId: "reading", deleteInstances: true },
    }, dependencies)

    expect(execution.data.collections.map(collection => collection.id)).toEqual(["ai"])
    expect(execution.data.collectionEntries).toEqual([
      { collectionId: "ai", instanceId: "rss:feed::one", addedAt: 2, position: 0 },
      { collectionId: "ai", instanceId: "rss:feed::two", addedAt: 3, position: 1 },
    ])
    expect(execution.data.instances.map(instance => instance.instanceId)).toEqual([
      "rss:feed::one",
      "rss:feed::two",
    ])
  })

  it("adds the same Instance to another Collection without changing existing membership", () => {
    const initial = createData()
    initial.collections.push({ id: "ai", name: "AI", createdAt: 2 })
    initial.collectionViews.push({
      collectionId: "ai",
      defaultLayer: "now",
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

  it("creates an Instance and multiple Collection memberships atomically", () => {
    const initial = createData()
    initial.collections.push({ id: "ai", name: "AI", createdAt: 2 })
    const execution = executeApplicationAction(initial, {
      type: "instance.create",
      input: {
        collectionIds: ["reading", "ai"],
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
    expect(execution.data.collectionEntries.slice(-2)).toEqual([
      {
        collectionId: "reading",
        instanceId: "github:trending::collection-new",
        addedAt: 100,
        position: 0,
      },
      {
        collectionId: "ai",
        instanceId: "github:trending::collection-new",
        addedAt: 100,
        position: 0,
      },
    ])
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
