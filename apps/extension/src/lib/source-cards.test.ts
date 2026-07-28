import type { SourceInstance } from "./source-cards"
import type { SourceDescriptor } from "@/typings/source"
import { describe, expect, it } from "vitest"
import {
  buildBoardSources,
  createForkedInstance,
  mergeSourceInstancePatch,
} from "./source-cards"

const testSources: SourceDescriptor[] = [
  {
    id: "test:feed",
    provider: {
      title: "Test",
    },
    color: "blue",
    category: "tech",
    home: "https://example.com",
    icon: "https://example.com/icon.png",
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
    provider: {
      title: "Latest",
    },
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
    patch: {},
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
        createCustomInstance({ patch: { params: { topic: "custom" } } }),
      ],
      isLocalOnly: true,
    })

    expect(boardSources.ids).toEqual(["test:feed::fork_abc"])
    expect(boardSources.map["test:feed::fork_abc"]).toMatchObject({
      isCustom: true,
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
          patch: { metadata: { title: "Custom Radar Title" } },
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
          patch: {
            metadata: {
              title: "Custom Title",
              badge: "https://custom.example.com/badge.png",
              desc: "Custom description",
              home: "https://custom.example.com",
              color: "red",
            },
          },
        }),
      ],
      isLocalOnly: true,
    })

    expect(boardSources.map["test:feed::fork_abc"]).toMatchObject({
      title: "Custom Title",
      badge: "https://custom.example.com/badge.png",
      icon: "https://example.com/icon.png",
      desc: "Custom description",
      home: "https://custom.example.com",
      color: "red",
    })
  })

  it("ignores persisted instance icon overrides", () => {
    const boardSources = buildBoardSources({
      sources: testSources,
      boardId: "forks",
      starredSourceInstanceIds: [],
      sourceInstances: [
        createCustomInstance({
          patch: {
            metadata: {
              icon: "https://custom.example.com/icon.png",
            },
          } as unknown as SourceInstance["patch"],
        }),
      ],
      isLocalOnly: true,
    })

    expect(boardSources.map["test:feed::fork_abc"].icon).toBe(
      "https://example.com/icon.png",
    )
  })

  it("does not allow persisted instance metadata to override provider identity", () => {
    const boardSources = buildBoardSources({
      sources: testSources,
      boardId: "forks",
      starredSourceInstanceIds: [],
      sourceInstances: [
        createCustomInstance({
          patch: {
            metadata: {
              provider: {
                title: "Injected Provider",
                icon: "https://malicious.example/icon.png",
              },
            },
          } as unknown as SourceInstance["patch"],
        }),
      ],
      isLocalOnly: true,
    })

    expect(boardSources.map["test:feed::fork_abc"].provider).toEqual({
      title: "Test",
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
})

describe("mergeSourceInstancePatch", () => {
  it("merges params and metadata independently", () => {
    expect(mergeSourceInstancePatch(
      {
        params: { username: "newsnext_dev" },
        metadata: { title: "NewsNext" },
      },
      {
        params: { includeReplies: true },
        metadata: { color: "blue" },
      },
    )).toEqual({
      params: {
        username: "newsnext_dev",
        includeReplies: true,
      },
      metadata: {
        title: "NewsNext",
        color: "blue",
      },
    })
  })
})

describe("createForkedInstance", () => {
  it("persists the supplied final patch without rebuilding it from a board source", () => {
    const patch = {
      params: { language: "typescript" },
      metadata: { title: "Trending TypeScript" },
    }
    const originRef = { type: "radar", ruleId: "github-trending" } as const

    expect(createForkedInstance("github:trending", patch, originRef)).toMatchObject({
      sourceId: "github:trending",
      patch,
      originRef,
    })
  })
})
