import type { SourceInstance } from "./source-cards"
import type { SourceDescriptor } from "@/typings/source"
import { describe, expect, it } from "vitest"
import {
  buildSourceCards,
  createCardInstance,
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
    instanceId: "test:feed::card_abc",
    sourceId: "test:feed",
    boardId: null,
    patch: {},
    createdAt: 1,
    ...patch,
  }
}

describe("buildSourceCards", () => {
  it("shows saved card instances", () => {
    const cards = buildSourceCards({
      sources: testSources,
      boardId: "inbox",
      sourceInstances: [
        createCustomInstance({ patch: { params: { topic: "custom" } } }),
      ],
    })

    expect(cards.ids).toEqual(["test:feed::card_abc"])
    expect(cards.map["test:feed::card_abc"]).toMatchObject({
      paramsValue: { topic: "custom" },
      sourceId: "test:feed",
    })
  })

  it("applies source instance title overrides", () => {
    const cards = buildSourceCards({
      sources: testSources,
      boardId: "inbox",
      sourceInstances: [
        createCustomInstance({
          patch: { metadata: { title: "Custom Radar Title" } },
        }),
      ],
    })

    expect(cards.map["test:feed::card_abc"]).toMatchObject({
      title: "Custom Radar Title",
    })
  })

  it("applies source instance metadata overrides", () => {
    const cards = buildSourceCards({
      sources: testSources,
      boardId: "inbox",
      sourceInstances: [
        createCustomInstance({
          patch: {
            metadata: {
              title: "Custom Title",
              icon: "https://custom.example.com/icon.png",
              badge: "https://custom.example.com/badge.png",
              desc: "Custom description",
              home: "https://custom.example.com",
              color: "red",
              type: "hottest",
              category: "world",
            },
          },
        }),
      ],
    })

    expect(cards.map["test:feed::card_abc"]).toMatchObject({
      title: "Custom Title",
      icon: "https://custom.example.com/icon.png",
      badge: "https://custom.example.com/badge.png",
      desc: "Custom description",
      home: "https://custom.example.com",
      color: "red",
      type: "hottest",
      category: "world",
    })
  })

  it("does not allow persisted instance metadata to override provider identity", () => {
    const cards = buildSourceCards({
      sources: testSources,
      boardId: "inbox",
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
    })

    expect(cards.map["test:feed::card_abc"].provider).toEqual({
      title: "Test",
    })
  })

  it("hides base source templates from boards", () => {
    const cards = buildSourceCards({
      sources: testSources,
      boardId: "inbox",
      sourceInstances: [],
    })

    expect(cards.ids).toEqual([])
    expect(cards.map).toEqual({})
  })

  it("shows every card in Inbox", () => {
    const cards = buildSourceCards({
      sources: testSources,
      boardId: "inbox",
      sourceInstances: [
        createCustomInstance(),
        createCustomInstance({
          instanceId: "test:latest::card_def",
          sourceId: "test:latest",
          boardId: "reading",
        }),
      ],
    })

    expect(cards.ids).toEqual([
      "test:feed::card_abc",
      "test:latest::card_def",
    ])
  })

  it("filters cards in a custom board", () => {
    const cards = buildSourceCards({
      sources: testSources,
      boardId: "reading",
      sourceInstances: [
        createCustomInstance(),
        createCustomInstance({
          instanceId: "test:latest::card_def",
          sourceId: "test:latest",
          boardId: "reading",
        }),
      ],
    })

    expect(cards.ids).toEqual(["test:latest::card_def"])
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

describe("createCardInstance", () => {
  it("persists the supplied final patch without rebuilding it from a board source", () => {
    const patch = {
      params: { language: "typescript" },
      metadata: { title: "Trending TypeScript" },
    }
    expect(createCardInstance("github:trending", "reading", patch)).toMatchObject({
      sourceId: "github:trending",
      boardId: "reading",
      patch,
    })
  })
})
