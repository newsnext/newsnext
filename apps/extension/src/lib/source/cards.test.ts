import type { SourceInstance } from "./cards"
import type { SourceDescriptor } from "@/typings/source"
import { describe, expect, it } from "vitest"
import {
  applySourceLoaderMetadata,
  buildSourceCards,
  getSourceCard,
  mergeSourceInstancePatch,
} from "./cards"

const testSources: SourceDescriptor[] = [
  {
    id: "test:feed",
    provider: {
      title: "Test",
      category: "social",
      icon: "https://example.com/icon.png",
      color: "blue",
    },
    metadata: {
      home: "https://example.com",
    },
    capabilities: {
      network: [],
      cookies: [],
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
    metadata: {
      home: "https://latest.example.com",
    },
    capabilities: {
      network: [],
      cookies: [],
    },
    cache: {
      version: 1,
      maxAge: "5m",
    },
  },
]

function createCustomInstance(patch: Partial<SourceInstance> = {}): SourceInstance {
  return {
    instanceId: "test:feed::AbCdEfGh1234",
    sourceId: "test:feed",
    patch: {},
    createdAt: 1,
    ...patch,
  }
}

describe("buildSourceCards", () => {
  it("shows saved card instances", () => {
    const cards = buildSourceCards({
      sources: testSources,
      collectionId: null,
      sourceInstances: [
        createCustomInstance({ patch: { params: { topic: "custom" } } }),
      ],
    })

    expect(cards.ids).toEqual(["test:feed::AbCdEfGh1234"])
    expect(cards.map["test:feed::AbCdEfGh1234"]).toMatchObject({
      paramsValue: { topic: "custom" },
      sourceId: "test:feed",
    })
  })

  it("applies source instance title overrides", () => {
    const cards = buildSourceCards({
      sources: testSources,
      collectionId: null,
      sourceInstances: [
        createCustomInstance({
          patch: { metadata: { title: "Custom Radar Title" } },
        }),
      ],
    })

    expect(cards.map["test:feed::AbCdEfGh1234"]).toMatchObject({
      metadata: {
        title: "Custom Radar Title",
      },
    })
  })

  it("applies source-owned instance metadata overrides", () => {
    const cards = buildSourceCards({
      sources: testSources,
      collectionId: null,
      sourceInstances: [
        createCustomInstance({
          patch: {
            metadata: {
              title: "Custom Title",
              badge: "https://custom.example.com/badge.png",
              desc: "Custom description",
              home: "https://custom.example.com",
            },
          },
        }),
      ],
    })

    expect(cards.map["test:feed::AbCdEfGh1234"]).toMatchObject({
      metadata: {
        title: "Custom Title",
        badge: "https://custom.example.com/badge.png",
        desc: "Custom description",
        home: "https://custom.example.com",
      },
      provider: {
        icon: "https://example.com/icon.png",
        color: "blue",
      },
    })
  })

  it("does not allow persisted instance metadata to override provider metadata", () => {
    const cards = buildSourceCards({
      sources: testSources,
      collectionId: null,
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

    const card = cards.map["test:feed::AbCdEfGh1234"]
    expect(card).toBeDefined()
    expect(card?.provider).toEqual({
      title: "Test",
      category: "social",
      icon: "https://example.com/icon.png",
      color: "blue",
    })
    expect(card).not.toHaveProperty("category")
    expect(card).not.toHaveProperty("icon")
    expect(card).not.toHaveProperty("color")
  })

  it("hides base source templates from boards", () => {
    const cards = buildSourceCards({
      sources: testSources,
      collectionId: null,
      sourceInstances: [],
    })

    expect(cards.ids).toEqual([])
    expect(cards.map).toEqual({})
  })

  it("shows every card in All", () => {
    const cards = buildSourceCards({
      sources: testSources,
      collectionId: null,
      sourceInstances: [
        createCustomInstance(),
        createCustomInstance({
          instanceId: "test:latest::ZyXwVuTs9876",
          sourceId: "test:latest",
        }),
      ],
    })

    expect(cards.ids).toEqual([
      "test:feed::AbCdEfGh1234",
      "test:latest::ZyXwVuTs9876",
    ])
  })

  it("filters cards in a custom board", () => {
    const cards = buildSourceCards({
      sources: testSources,
      collectionId: "reading",
      collectionInstanceIds: ["test:latest::ZyXwVuTs9876"],
      sourceInstances: [
        createCustomInstance(),
        createCustomInstance({
          instanceId: "test:latest::ZyXwVuTs9876",
          sourceId: "test:latest",
        }),
      ],
    })

    expect(cards.ids).toEqual(["test:latest::ZyXwVuTs9876"])
  })
})

describe("applySourceLoaderMetadata", () => {
  it("overrides instance presentation fields while preserving missing fields", () => {
    const cards = buildSourceCards({
      sources: testSources,
      collectionId: null,
      sourceInstances: [
        createCustomInstance({
          patch: { metadata: { title: "Radar title", desc: "Radar description" } },
        }),
      ],
    })
    const source = getSourceCard(cards, "test:feed::AbCdEfGh1234")

    expect(applySourceLoaderMetadata(source, {
      title: "Loader title",
      home: "https://loader.example.com",
    })).toMatchObject({
      metadata: {
        title: "Loader title",
        desc: "Radar description",
        home: "https://loader.example.com",
      },
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
