import type { SourceDescriptor } from "@newsnext/source-kit/types"
import type { ApplicationData } from "./data"
import { describe, expect, it } from "vitest"
import { executeApplicationQuery } from "./queries"

function createData(): ApplicationData {
  return {
    collections: [{ id: "reading", name: "Reading", createdAt: 1 }],
    collectionViews: [{
      collectionId: "reading",
      defaultView: "now",
      sortMode: "createdAt",
      automaticSortMode: "createdAt",
    }],
    collectionEntries: [
      { collectionId: "reading", instanceId: "second", addedAt: 2, position: 1 },
      { collectionId: "reading", instanceId: "first", addedAt: 1, position: 0 },
    ],
    instances: [
      { instanceId: "first", sourceId: "rss:first", patch: {}, createdAt: 1 },
      { instanceId: "second", sourceId: "rss:second", patch: {}, createdAt: 2 },
    ],
  }
}

describe("application queries", () => {
  it("resolves Sources from the shared Query context", () => {
    const source = { id: "rss:first" } as SourceDescriptor

    expect(executeApplicationQuery(createData(), { type: "source.list" }, {
      sources: [source],
    })).toEqual([source])
    expect(executeApplicationQuery(createData(), {
      type: "source.get",
      input: { sourceId: "rss:first" },
    }, { sources: [source] })).toBe(source)
  })

  it("lists Collection Instances in membership order", () => {
    const instances = executeApplicationQuery(createData(), {
      type: "collection.listInstances",
      input: { collectionId: "reading" },
    })

    expect(instances.map(instance => instance.instanceId)).toEqual(["first", "second"])
  })

  it("returns Collection data, entries, and resolved Instances together", () => {
    const detail = executeApplicationQuery(createData(), {
      type: "collection.get",
      input: { collectionId: "reading" },
    })

    expect(detail.collection.name).toBe("Reading")
    expect(detail.entries.map(entry => entry.instanceId)).toEqual(["first", "second"])
    expect(detail.instances.map(instance => instance.instanceId)).toEqual(["first", "second"])
  })

  it("rejects an unknown Collection", () => {
    expect(() => executeApplicationQuery(createData(), {
      type: "collection.listInstances",
      input: { collectionId: "missing" },
    })).toThrow("Collection 'missing' not found")
  })

  it("resolves the current Board View to Data identities", () => {
    expect(executeApplicationQuery(createData(), { type: "view.getContext" }, {
      currentBoardId: "reading",
    })).toEqual({
      boardId: "reading",
      boardName: "Reading",
      collectionId: "reading",
    })
    expect(executeApplicationQuery(createData(), { type: "view.getVisibleLiveCards" }, {
      currentBoardId: "reading",
    })).toEqual([
      {
        collectionId: "reading",
        collectionIds: ["reading"],
        instanceId: "first",
        sourceId: "rss:first",
      },
      {
        collectionId: "reading",
        collectionIds: ["reading"],
        instanceId: "second",
        sourceId: "rss:second",
      },
    ])
  })

  it("reads durable Collection View preferences separately from Collection data", () => {
    expect(executeApplicationQuery(createData(), {
      type: "view.getCollection",
      input: { collectionId: "reading" },
    })).toEqual({
      collectionId: "reading",
      defaultView: "now",
      sortMode: "createdAt",
      automaticSortMode: "createdAt",
    })
  })

  it("falls back to the All View when the current Collection is missing", () => {
    expect(executeApplicationQuery(createData(), { type: "view.getContext" }, {
      currentBoardId: "missing",
    })).toEqual({ boardId: "all", boardName: "All", collectionId: null })
  })
})
