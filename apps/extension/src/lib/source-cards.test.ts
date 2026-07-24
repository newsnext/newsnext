import type { SourceInstance } from "./source-cards"
import type { SourceDescriptor } from "@/typings/source"
import { describe, expect, it } from "vitest"
import { buildAllBoardSources, buildBoardSources, FEATURED_SOURCE_IDS, getDefaultSourceInstanceId } from "./source-cards"

const testSources: SourceDescriptor[] = [
  {
    id: "test:feed",
    providerTitle: "Test",
    color: "blue",
    category: "tech",
    home: "https://example.com",
    capabilities: {
      network: [],
      cookies: [],
      browser: [],
    },
    cache: {
      version: 1,
      maxAge: "5m",
    },
  },
  {
    id: "test:latest",
    providerTitle: "Latest",
    color: "green",
    category: "tech",
    home: "https://latest.example.com",
    capabilities: {
      network: [],
      cookies: [],
      browser: [],
    },
    cache: {
      version: 1,
      maxAge: "5m",
    },
  },
]

function createCustomInstance(patch: Partial<SourceInstance> = {}): SourceInstance {
  return {
    instanceId: "test:feed::fork_abc",
    sourceId: "test:feed",
    paramsPatch: {},
    origin: "fork",
    createdAt: 1,
    updatedAt: 1,
    ...patch,
  }
}

describe("buildBoardSources", () => {
  it("shows every base source when building the all-sources list", () => {
    const boardSources = buildAllBoardSources({
      sources: testSources,
      sourceInstances: [],
      isLocalOnly: true,
    })

    expect(boardSources.ids).toEqual(["test:feed::default", "test:latest::default"])
    expect(boardSources.map["test:feed::default"]).toMatchObject({
      isCustom: false,
      origin: "default",
      isLocalOnly: true,
      sourceId: "test:feed",
    })
  })

  it("includes custom instances in the all-sources list", () => {
    const boardSources = buildAllBoardSources({
      sources: testSources,
      sourceInstances: [
        createCustomInstance({ paramsPatch: { topic: "custom" } }),
      ],
      isLocalOnly: true,
    })

    expect(boardSources.ids).toEqual(["test:feed::default", "test:feed::fork_abc", "test:latest::default"])
    expect(boardSources.map["test:feed::fork_abc"]).toMatchObject({
      isCustom: true,
      origin: "fork",
      paramsValue: { topic: "custom" },
      sourceId: "test:feed",
    })
  })

  it("applies source instance title overrides", () => {
    const boardSources = buildAllBoardSources({
      sources: testSources,
      sourceInstances: [
        createCustomInstance({
          metaPatch: { title: "Custom Radar Title" },
        }),
      ],
      isLocalOnly: true,
    })

    expect(boardSources.map["test:feed::fork_abc"]).toMatchObject({
      title: "Custom Radar Title",
    })
  })

  it("applies source instance metadata overrides", () => {
    const boardSources = buildAllBoardSources({
      sources: testSources,
      sourceInstances: [
        createCustomInstance({
          metaPatch: {
            providerTitle: "Custom Provider",
            title: "Custom Title",
            desc: "Custom description",
            home: "https://custom.example.com",
            color: "red",
          },
        }),
      ],
      isLocalOnly: true,
    })

    expect(boardSources.map["test:feed::fork_abc"]).toMatchObject({
      providerTitle: "Custom Provider",
      title: "Custom Title",
      desc: "Custom description",
      home: "https://custom.example.com",
      color: "red",
    })
  })

  it("hides sources that are not configured for the featured board", () => {
    const boardSources = buildBoardSources({
      sources: testSources,
      boardId: "featured",
      starredSourceInstanceIds: [],
      sourceInstances: [],
      isLocalOnly: true,
    })

    expect(boardSources.ids).toEqual([])
    expect(boardSources.map).toEqual({})
  })

  it("shows only configured featured source ids in configured order", () => {
    const originalFeaturedSourceIds = [...FEATURED_SOURCE_IDS]
    FEATURED_SOURCE_IDS.push("test:latest", "test:feed")

    try {
      const boardSources = buildBoardSources({
        sources: testSources,
        boardId: "featured",
        starredSourceInstanceIds: [],
        sourceInstances: [],
        isLocalOnly: true,
      })

      expect(boardSources.ids).toEqual(["test:latest::default", "test:feed::default"])
    } finally {
      FEATURED_SOURCE_IDS.splice(0, FEATURED_SOURCE_IDS.length, ...originalFeaturedSourceIds)
    }
  })

  it("marks local-only base and custom sources", () => {
    const boardSources = buildBoardSources({
      sources: testSources,
      boardId: "forks",
      starredSourceInstanceIds: [],
      sourceInstances: [
        createCustomInstance(),
      ],
      isLocalOnly: true,
    })

    expect(boardSources.map["test:feed::fork_abc"]).toMatchObject({
      isCustom: true,
      isLocalOnly: true,
      sourceId: "test:feed",
    })
  })

  it("uses stable default instance ids for source templates", () => {
    expect(getDefaultSourceInstanceId("test:feed")).toBe("test:feed::default")
  })
})
