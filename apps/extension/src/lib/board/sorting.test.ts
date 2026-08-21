import type { LiveCardViewModel } from "@/typings/source"
import { describe, expect, it } from "vitest"
import {
  DEFAULT_NOW_LAYER_SORT,
  orderNowLayerInstanceIds,
} from "./sorting"

function createLiveCard({
  id,
  provider,
  title,
  createdAt,
}: {
  id: string
  provider: string
  title?: string
  createdAt: number
}): LiveCardViewModel {
  return {
    id,
    sourceId: id.split("::")[0] ?? id,
    collectionId: "reading",
    createdAt,
    provider: {
      title: provider,
      color: "blue",
    },
    metadata: {
      title,
    },
    capabilities: {
      network: [],
      cookies: [],
    },
    version: 1,
  }
}

function indexLiveCards(sources: LiveCardViewModel[]): Record<string, LiveCardViewModel> {
  return Object.fromEntries(sources.map(liveCard => [liveCard.id, liveCard]))
}

describe("orderNowLayerInstanceIds", () => {
  it("uses collection membership order for addedAt sorting", () => {
    const sources = [
      createLiveCard({ id: "test:old::1", provider: "Test", createdAt: 1 }),
      createLiveCard({ id: "test:new::2", provider: "Test", createdAt: 3 }),
      createLiveCard({ id: "test:middle::3", provider: "Test", createdAt: 2 }),
    ]

    expect(orderNowLayerInstanceIds({
      instanceIds: sources.map(liveCard => liveCard.id),
      liveCardsByInstanceId: indexLiveCards(sources),
      sort: DEFAULT_NOW_LAYER_SORT,
    })).toEqual([
      "test:old::1",
      "test:new::2",
      "test:middle::3",
    ])
  })

  it("sorts by provider and then the current LiveCard title", () => {
    const sources = [
      createLiveCard({ id: "beta:feed::1", provider: "Beta", title: "Feed", createdAt: 4 }),
      createLiveCard({ id: "alpha:ten::2", provider: "Alpha", title: "Topic 10", createdAt: 3 }),
      createLiveCard({ id: "alpha:two::3", provider: "alpha", title: "Topic 2", createdAt: 2 }),
      createLiveCard({ id: "alpha:fallback::4", provider: "Alpha", createdAt: 1 }),
    ]

    expect(orderNowLayerInstanceIds({
      instanceIds: sources.map(liveCard => liveCard.id),
      liveCardsByInstanceId: indexLiveCards(sources),
      sort: {
        mode: "provider",
        automaticMode: "provider",
        manualOrder: [],
      },
    })).toEqual([
      "alpha:fallback::4",
      "alpha:two::3",
      "alpha:ten::2",
      "beta:feed::1",
    ])
  })

  it("keeps manual LiveCards in place, removes hidden LiveCards, and appends new LiveCards", () => {
    const sources = [
      createLiveCard({ id: "test:old::1", provider: "Test", createdAt: 1 }),
      createLiveCard({ id: "test:new::2", provider: "Test", createdAt: 3 }),
      createLiveCard({ id: "test:middle::3", provider: "Test", createdAt: 2 }),
    ]

    expect(orderNowLayerInstanceIds({
      instanceIds: sources.map(liveCard => liveCard.id),
      liveCardsByInstanceId: indexLiveCards(sources),
      sort: {
        mode: "manual",
        automaticMode: "addedAt",
        manualOrder: ["test:old::1", "test:hidden::4"],
      },
    })).toEqual([
      "test:old::1",
      "test:new::2",
      "test:middle::3",
    ])
  })

  it("uses the last automatic mode when manual order has not been set", () => {
    const sources = [
      createLiveCard({ id: "beta:feed::1", provider: "Beta", createdAt: 2 }),
      createLiveCard({ id: "alpha:feed::2", provider: "Alpha", createdAt: 1 }),
    ]

    expect(orderNowLayerInstanceIds({
      instanceIds: sources.map(liveCard => liveCard.id),
      liveCardsByInstanceId: indexLiveCards(sources),
      sort: {
        mode: "manual",
        automaticMode: "provider",
        manualOrder: [],
      },
    })).toEqual([
      "alpha:feed::2",
      "beta:feed::1",
    ])
  })

  it("preserves LiveCard IDs while presentation data is unavailable", () => {
    const liveCard = createLiveCard({ id: "test:available::1", provider: "Test", createdAt: 1 })

    expect(orderNowLayerInstanceIds({
      instanceIds: [liveCard.id, "test:missing::2"],
      liveCardsByInstanceId: indexLiveCards([liveCard]),
      sort: DEFAULT_NOW_LAYER_SORT,
    })).toEqual([liveCard.id, "test:missing::2"])
  })
})
