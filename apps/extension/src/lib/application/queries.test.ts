import type { SourceDescriptor } from "@newsnext/source-kit/types"
import type { ApplicationData } from "./data"
import { describe, expect, it } from "vitest"
import {
  getBoardConfigurationQuery,
  getNowLayerLiveCardsQuery,
  listCollectionInstancesQuery,
  listSourcesQuery,
} from "./queries"

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
    expect(listSourcesQuery([source]))
      .toEqual([source])
  })

  it("lists Collection Instances in instanceIds order", () => {
    const instances = listCollectionInstancesQuery(createData(), { collectionId: "reading" })
    expect(instances.map(instance => instance.instanceId)).toEqual(["second", "first"])
  })

  it("returns NowLayer cards without registry filtering", () => {
    expect(getNowLayerLiveCardsQuery(createData(), "reading").map(card => card.instanceId))
      .toEqual(["second", "first"])
  })

  it("returns nested Board configuration", () => {
    expect(getBoardConfigurationQuery(createData(), { collectionId: "reading" })).toEqual({
      defaultLayer: "now",
      nowLayer: { sort: { mode: "addedAt", automaticMode: "addedAt", manualOrder: [] } },
    })
  })
})
