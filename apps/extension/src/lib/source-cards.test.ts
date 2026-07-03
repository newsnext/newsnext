import type { SourceDescriptor } from "@/typings/source"
import { describe, expect, it } from "vitest"
import { buildAllBoardSources, buildBoardSources, FEATURED_SOURCE_IDS } from "./source-cards"

const testSources: SourceDescriptor[] = [
  {
    id: "test:feed",
    providerTitle: "Test",
    color: "blue",
    category: "tech",
    home: "https://example.com",
  },
  {
    id: "test:latest",
    providerTitle: "Latest",
    color: "green",
    category: "tech",
    home: "https://latest.example.com",
  },
]

describe("buildBoardSources", () => {
  it("shows every base source when building the all-sources list", () => {
    const boardSources = buildAllBoardSources({
      sources: testSources,
      sourceInstances: [],
      isLocalOnly: true,
    })

    expect(boardSources.ids).toEqual(["test:feed", "test:latest"])
    expect(boardSources.map["test:feed"]).toMatchObject({
      isFork: false,
      isLocalOnly: true,
      sourceId: "test:feed",
    })
  })

  it("includes forks in the all-sources list", () => {
    const boardSources = buildAllBoardSources({
      sources: testSources,
      sourceInstances: [
        {
          instanceId: "test:feed::fork",
          sourceId: "test:feed",
          params: { topic: "custom" },
          isFork: true,
          createdAt: 1,
        },
      ],
      isLocalOnly: true,
    })

    expect(boardSources.ids).toEqual(["test:feed", "test:feed::fork", "test:latest"])
    expect(boardSources.map["test:feed::fork"]).toMatchObject({
      isFork: true,
      paramsValue: { topic: "custom" },
      sourceId: "test:feed",
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

      expect(boardSources.ids).toEqual(["test:latest", "test:feed"])
    } finally {
      FEATURED_SOURCE_IDS.splice(0, FEATURED_SOURCE_IDS.length, ...originalFeaturedSourceIds)
    }
  })

  it("marks local-only base and forked sources", () => {
    const boardSources = buildBoardSources({
      sources: testSources,
      boardId: "forks",
      starredSourceInstanceIds: [],
      sourceInstances: [
        {
          instanceId: "test:feed::fork",
          sourceId: "test:feed",
          params: {},
          isFork: true,
          createdAt: 1,
        },
      ],
      isLocalOnly: true,
    })

    expect(boardSources.map["test:feed::fork"]).toMatchObject({
      isFork: true,
      isLocalOnly: true,
      sourceId: "test:feed",
    })
  })
})
