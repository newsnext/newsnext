import type { CardViewModel } from "@/typings/source"
import { describe, expect, it } from "vitest"
import {
  DEFAULT_BOARD_SORT_PREFERENCE,
  orderCardInstanceIds,
} from "./sorting"

function createSource({
  id,
  provider,
  title,
  createdAt,
}: {
  id: string
  provider: string
  title?: string
  createdAt: number
}): CardViewModel {
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
    cache: {
      version: 1,
      maxAge: "5m",
    },
  }
}

function createSourcesMap(sources: CardViewModel[]): Record<string, CardViewModel> {
  return Object.fromEntries(sources.map(card => [card.id, card]))
}

describe("orderCardInstanceIds", () => {
  it("sorts newly added cards first by default", () => {
    const sources = [
      createSource({ id: "test:old::1", provider: "Test", createdAt: 1 }),
      createSource({ id: "test:new::2", provider: "Test", createdAt: 3 }),
      createSource({ id: "test:middle::3", provider: "Test", createdAt: 2 }),
    ]

    expect(orderCardInstanceIds({
      instanceIds: sources.map(card => card.id),
      cardsByInstanceId: createSourcesMap(sources),
      preference: DEFAULT_BOARD_SORT_PREFERENCE,
    })).toEqual([
      "test:new::2",
      "test:middle::3",
      "test:old::1",
    ])
  })

  it("sorts by provider and then the current card title", () => {
    const sources = [
      createSource({ id: "beta:feed::1", provider: "Beta", title: "Feed", createdAt: 4 }),
      createSource({ id: "alpha:ten::2", provider: "Alpha", title: "Topic 10", createdAt: 3 }),
      createSource({ id: "alpha:two::3", provider: "alpha", title: "Topic 2", createdAt: 2 }),
      createSource({ id: "alpha:fallback::4", provider: "Alpha", createdAt: 1 }),
    ]

    expect(orderCardInstanceIds({
      instanceIds: sources.map(card => card.id),
      cardsByInstanceId: createSourcesMap(sources),
      preference: {
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

  it("keeps manual cards in place, removes hidden cards, and appends new cards", () => {
    const sources = [
      createSource({ id: "test:old::1", provider: "Test", createdAt: 1 }),
      createSource({ id: "test:new::2", provider: "Test", createdAt: 3 }),
      createSource({ id: "test:middle::3", provider: "Test", createdAt: 2 }),
    ]

    expect(orderCardInstanceIds({
      instanceIds: sources.map(card => card.id),
      cardsByInstanceId: createSourcesMap(sources),
      preference: {
        mode: "manual",
        automaticMode: "createdAt",
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
      createSource({ id: "beta:feed::1", provider: "Beta", createdAt: 2 }),
      createSource({ id: "alpha:feed::2", provider: "Alpha", createdAt: 1 }),
    ]

    expect(orderCardInstanceIds({
      instanceIds: sources.map(card => card.id),
      cardsByInstanceId: createSourcesMap(sources),
      preference: {
        mode: "manual",
        automaticMode: "provider",
        manualOrder: [],
      },
    })).toEqual([
      "alpha:feed::2",
      "beta:feed::1",
    ])
  })

  it("drops card IDs that no longer have card data", () => {
    const card = createSource({ id: "test:available::1", provider: "Test", createdAt: 1 })

    expect(orderCardInstanceIds({
      instanceIds: [card.id, "test:missing::2"],
      cardsByInstanceId: createSourcesMap([card]),
      preference: DEFAULT_BOARD_SORT_PREFERENCE,
    })).toEqual([card.id])
  })
})
