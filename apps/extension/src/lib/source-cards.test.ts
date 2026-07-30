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
      category: "social",
      icon: "https://example.com/icon.png",
      color: "blue",
    },
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
    provider: {
      title: "Latest",
      category: "social",
      color: "green",
    },
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

  it("applies source-owned instance metadata overrides", () => {
    const cards = buildSourceCards({
      sources: testSources,
      boardId: "inbox",
      sourceInstances: [
        createCustomInstance({
          patch: {
            metadata: {
              title: "Custom Title",
              badge: "https://custom.example.com/badge.png",
              desc: "Custom description",
              home: "https://custom.example.com",
              type: "hottest",
            },
          },
        }),
      ],
    })

    expect(cards.map["test:feed::card_abc"]).toMatchObject({
      title: "Custom Title",
      badge: "https://custom.example.com/badge.png",
      desc: "Custom description",
      home: "https://custom.example.com",
      type: "hottest",
      provider: {
        icon: "https://example.com/icon.png",
        color: "blue",
      },
    })
  })

  it("does not allow persisted instance metadata to override provider metadata", () => {
    const cards = buildSourceCards({
      sources: testSources,
      boardId: "inbox",
      sourceInstances: [
        createCustomInstance({
          patch: {
            metadata: {
              category: "forum",
              icon: "injected-icon",
              color: "red",
              provider: {
                title: "Injected Provider",
                category: "forum",
              },
            },
          } as unknown as SourceInstance["patch"],
        }),
      ],
    })

    expect(cards.map["test:feed::card_abc"].provider).toEqual({
      title: "Test",
      category: "social",
      icon: "https://example.com/icon.png",
      color: "blue",
    })
    expect(cards.map["test:feed::card_abc"]).not.toHaveProperty("category")
    expect(cards.map["test:feed::card_abc"]).not.toHaveProperty("icon")
    expect(cards.map["test:feed::card_abc"]).not.toHaveProperty("color")
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
        metadata: { desc: "Developer news" },
      },
    )).toEqual({
      params: {
        username: "newsnext_dev",
        includeReplies: true,
      },
      metadata: {
        title: "NewsNext",
        desc: "Developer news",
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
