import type { SourceInstance } from "./source-cards"
import type { SourceDescriptor } from "@/typings/source"
import { describe, expect, it } from "vitest"
import { buildBoardSources, getDefaultSourceInstanceId } from "./source-cards"

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
  it("shows forked instances on the forks board", () => {
    const boardSources = buildBoardSources({
      sources: testSources,
      boardId: "forks",
      starredSourceInstanceIds: [],
      sourceInstances: [
        createCustomInstance({ paramsPatch: { topic: "custom" } }),
      ],
      isLocalOnly: true,
    })

    expect(boardSources.ids).toEqual(["test:feed::fork_abc"])
    expect(boardSources.map["test:feed::fork_abc"]).toMatchObject({
      isCustom: true,
      origin: "fork",
      paramsValue: { topic: "custom" },
      sourceId: "test:feed",
    })
  })

  it("applies source instance title overrides", () => {
    const boardSources = buildBoardSources({
      sources: testSources,
      boardId: "forks",
      starredSourceInstanceIds: [],
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
    const boardSources = buildBoardSources({
      sources: testSources,
      boardId: "forks",
      starredSourceInstanceIds: [],
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

  it("hides base source templates from boards", () => {
    const boardSources = buildBoardSources({
      sources: testSources,
      boardId: "forks",
      starredSourceInstanceIds: [],
      sourceInstances: [],
      isLocalOnly: true,
    })

    expect(boardSources.ids).toEqual([])
    expect(boardSources.map).toEqual({})
  })

  it("shows only starred forked instances on the stars board", () => {
    const forkedInstance = createCustomInstance()
    const boardSources = buildBoardSources({
      sources: testSources,
      boardId: "stars",
      starredSourceInstanceIds: [forkedInstance.instanceId, "test:latest::default"],
      sourceInstances: [forkedInstance],
      isLocalOnly: true,
    })

    expect(boardSources.ids).toEqual([forkedInstance.instanceId])
  })

  it("marks forked sources as local-only", () => {
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
