import type { SourceDescriptor } from "@newsnext/source-kit/types"
import type { ApplicationData } from "./data"
import { describe, expect, it } from "vitest"
import { executeApplicationQuery } from "./queries"

function createData(): ApplicationData {
  return {
    version: 2,
    collections: [{
      id: "reading",
      name: "Reading",
      createdAt: 1,
      instanceIds: ["second", "first"],
      defaultLayer: "now",
      nowLayer: { sort: { mode: "addedAt", automaticMode: "addedAt", manualOrder: [] } },
    }],
    instances: [
      { instanceId: "first", sourceId: "rss:first", patch: {}, createdAt: 1 },
      { instanceId: "second", sourceId: "rss:second", patch: {}, createdAt: 2 },
    ],
  }
}

describe("application queries", () => {
  it("resolves Sources from query context", () => {
    const source = { id: "rss:first" } as SourceDescriptor
    expect(executeApplicationQuery(createData(), { type: "source.list" }, { sources: [source] }))
      .toEqual([source])
  })

  it("lists Collection Instances in instanceIds order", () => {
    const instances = executeApplicationQuery(createData(), {
      type: "collection.listInstances",
      input: { collectionId: "reading" },
    })
    expect(instances.map(instance => instance.instanceId)).toEqual(["second", "first"])
  })

  it("returns NowLayer cards without registry filtering", () => {
    expect(executeApplicationQuery(createData(), { type: "nowLayer.getLiveCards" }, {
      currentBoardId: "reading",
      sources: [],
    }).map(card => card.instanceId)).toEqual(["second", "first"])
  })

  it("returns nested Board configuration", () => {
    expect(executeApplicationQuery(createData(), {
      type: "board.getConfiguration",
      input: { collectionId: "reading" },
    })).toEqual({
      defaultLayer: "now",
      nowLayer: { sort: { mode: "addedAt", automaticMode: "addedAt", manualOrder: [] } },
    })
  })
})
