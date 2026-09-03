import type { SourceDescriptor } from "@newsnext/source-kit/types"
import type { ApplicationData } from "./data"
import { describe, expect, it } from "vitest"
import {
  getBoardConfigurationQuery,
  getNowLayerLiveCardsQuery,
  listBoardInstancesQuery,
  listSourcesQuery,
} from "./queries"

function createData(): ApplicationData {
  return {
    version: 6,
    boards: [{
      color: "blue",
      id: "reading",
      illustration: null,
      name: "Reading",
      createdAt: 1,
      instanceIds: ["second", "first"],
      defaultLayer: "now",
      nowLayer: { sort: { mode: "addedAt", automaticMode: "addedAt", manualOrder: [] } },
      nextLayer: { widgets: [] },
    }],
    instances: [
      { instanceId: "first", workerId: "worker-a", sourceId: "rss:first", patch: {}, createdAt: 1 },
      { instanceId: "second", workerId: "worker-a", sourceId: "rss:second", patch: {}, createdAt: 2 },
    ],
  }
}

describe("application queries", () => {
  it("resolves Sources from query context", () => {
    const source = { id: "rss:first" } as SourceDescriptor
    expect(listSourcesQuery([source]))
      .toEqual([source])
  })

  it("lists Board Instances in instanceIds order", () => {
    const instances = listBoardInstancesQuery(createData(), { boardId: "reading" })
    expect(instances.map(instance => instance.instanceId)).toEqual(["second", "first"])
  })

  it("returns NowLayer cards without registry filtering", () => {
    expect(getNowLayerLiveCardsQuery(createData(), "reading")).toEqual([
      { boardId: "reading", instanceId: "second", sourceId: "rss:second" },
      { boardId: "reading", instanceId: "first", sourceId: "rss:first" },
    ])
  })

  it("returns nested Board configuration", () => {
    expect(getBoardConfigurationQuery(createData(), { boardId: "reading" })).toEqual({
      color: "blue",
      defaultLayer: "now",
      nowLayer: { sort: { mode: "addedAt", automaticMode: "addedAt", manualOrder: [] } },
    })
  })
})
