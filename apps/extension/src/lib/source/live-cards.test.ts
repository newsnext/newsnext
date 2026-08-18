import type { SourceInstance } from "./live-cards"
import type { SourceDescriptor } from "@/typings/source"
import { describe, expect, it } from "vitest"
import {
  applySourceLoaderMetadata,
  buildLiveCards,
  mergeSourceInstancePatch,
} from "./live-cards"

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

describe("buildLiveCards", () => {
  it("projects saved Instances as LiveCards", () => {
    const liveCards = buildLiveCards({
      sources: testSources,
      collectionId: null,
      sourceInstances: [
        createCustomInstance({ patch: { params: { topic: "custom" } } }),
      ],
    })

    expect(liveCards).toHaveLength(1)
    expect(liveCards[0]).toMatchObject({
      paramsValue: { topic: "custom" },
      sourceId: "test:feed",
    })
  })

  it("applies source instance title overrides", () => {
    const liveCards = buildLiveCards({
      sources: testSources,
      collectionId: null,
      sourceInstances: [
        createCustomInstance({
          patch: { metadata: { title: "Custom Radar Title" } },
        }),
      ],
    })

    expect(liveCards[0]).toMatchObject({
      metadata: {
        title: "Custom Radar Title",
      },
    })
  })

  it("applies source-owned instance metadata overrides", () => {
    const liveCards = buildLiveCards({
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

    expect(liveCards[0]).toMatchObject({
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
    const liveCards = buildLiveCards({
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

    const liveCard = liveCards[0]
    expect(liveCard).toBeDefined()
    expect(liveCard?.provider).toEqual({
      title: "Test",
      category: "social",
      icon: "https://example.com/icon.png",
      color: "blue",
    })
    expect(liveCard).not.toHaveProperty("category")
    expect(liveCard).not.toHaveProperty("icon")
    expect(liveCard).not.toHaveProperty("color")
  })

  it("hides base source templates from boards", () => {
    const liveCards = buildLiveCards({
      sources: testSources,
      collectionId: null,
      sourceInstances: [],
    })

    expect(liveCards).toEqual([])
  })

  it("shows every LiveCard in All", () => {
    const liveCards = buildLiveCards({
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

    expect(liveCards.map(liveCard => liveCard.id)).toEqual([
      "test:feed::AbCdEfGh1234",
      "test:latest::ZyXwVuTs9876",
    ])
  })

  it("filters LiveCards in a custom board", () => {
    const liveCards = buildLiveCards({
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

    expect(liveCards.map(liveCard => liveCard.id)).toEqual(["test:latest::ZyXwVuTs9876"])
  })
})

describe("applySourceLoaderMetadata", () => {
  it("overrides instance presentation fields while preserving missing fields", () => {
    const liveCards = buildLiveCards({
      sources: testSources,
      collectionId: null,
      sourceInstances: [
        createCustomInstance({
          patch: { metadata: { title: "Radar title", desc: "Radar description" } },
        }),
      ],
    })
    const [liveCard] = liveCards

    expect(applySourceLoaderMetadata(liveCard!, {
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
