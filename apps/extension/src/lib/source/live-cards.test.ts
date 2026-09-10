import type { LiveCard } from "./live-cards"
import type { SourceDescriptor } from "@/typings/source"
import { describe, expect, it } from "vitest"
import {
  applySourceLoaderMetadata,
  applySourceSnapshot,
  buildLiveCards,
  mergeLiveCardPatch,
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
    version: 1,
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
    version: 1,
  },
]

function createCustomLiveCard(patch: Partial<LiveCard> = {}): LiveCard {
  return {
    cardId: "test:feed::AbCdEfGh1234",
    workerId: "worker-a",
    sourceId: "test:feed",
    patch: {},
    createdAt: 1,
    ...patch,
  }
}

describe("buildLiveCards", () => {
  it("projects saved LiveCards as LiveCards", () => {
    const liveCards = buildLiveCards({
      sources: testSources,
      boardId: null,
      liveCards: [
        createCustomLiveCard({ patch: { params: { topic: "custom" } } }),
      ],
    })

    expect(liveCards).toHaveLength(1)
    expect(liveCards[0]).toMatchObject({
      paramsValue: { topic: "custom" },
      sourceId: "test:feed",
    })
  })

  it("applies LiveCard title overrides", () => {
    const liveCards = buildLiveCards({
      sources: testSources,
      boardId: null,
      liveCards: [
        createCustomLiveCard({
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

  it("applies source-owned card metadata overrides", () => {
    const liveCards = buildLiveCards({
      sources: testSources,
      boardId: null,
      liveCards: [
        createCustomLiveCard({
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

  it("does not allow persisted card metadata to override provider metadata", () => {
    const liveCards = buildLiveCards({
      sources: testSources,
      boardId: null,
      liveCards: [
        createCustomLiveCard({
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
          } as unknown as LiveCard["patch"],
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
      boardId: null,
      liveCards: [],
    })

    expect(liveCards).toEqual([])
  })

  it("shows every LiveCard in All", () => {
    const liveCards = buildLiveCards({
      sources: testSources,
      boardId: null,
      liveCards: [
        createCustomLiveCard(),
        createCustomLiveCard({
          cardId: "test:latest::ZyXwVuTs9876",
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
      boardId: "reading",
      boardCardIds: ["test:latest::ZyXwVuTs9876"],
      liveCards: [
        createCustomLiveCard(),
        createCustomLiveCard({
          cardId: "test:latest::ZyXwVuTs9876",
          sourceId: "test:latest",
        }),
      ],
    })

    expect(liveCards.map(liveCard => liveCard.id)).toEqual(["test:latest::ZyXwVuTs9876"])
  })
})

describe("applySourceLoaderMetadata", () => {
  it("overrides card presentation fields while preserving missing fields", () => {
    const liveCards = buildLiveCards({
      sources: testSources,
      boardId: null,
      liveCards: [
        createCustomLiveCard({
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

describe("applySourceSnapshot", () => {
  it("renders from the Loader snapshot while preserving LiveCard overrides", () => {
    const card = createCustomLiveCard({
      patch: {
        metadata: { title: "Saved title" },
        params: { topic: "rust" },
      },
    })
    const placeholder: SourceDescriptor = {
      ...testSources[0]!,
      metadata: { title: "Placeholder" },
      provider: { color: "slate", title: "Placeholder" },
      version: 0,
    }
    const liveCard = buildLiveCards({
      sources: [placeholder],
      boardId: "reading",
      liveCards: [card],
    })[0]!

    expect(applySourceSnapshot(liveCard, testSources[0]!)).toMatchObject({
      boardId: "reading",
      id: card.cardId,
      sourceId: card.sourceId,
      version: 1,
      paramsValue: { topic: "rust" },
      metadata: { title: "Saved title" },
      provider: { color: "blue", title: "Test" },
    })
  })
})

describe("mergeLiveCardPatch", () => {
  it("merges params and metadata independently", () => {
    expect(mergeLiveCardPatch(
      {
        params: { username: "newsnext_dev" },
        metadata: { title: "NewsNext" },
      },
      {
        params: { includeReplies: true, username: undefined },
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
