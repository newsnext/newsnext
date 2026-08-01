import type { BoardSource } from "@/typings/source"
import { describe, expect, it } from "vitest"
import {
  DEFAULT_BOARD_SORT_PREFERENCE,
  orderBoardSourceIds,
} from "./board-sorting"

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
}): BoardSource {
  return {
    id,
    sourceId: id.split("::")[0],
    boardId: "reading",
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

function createSourcesMap(sources: BoardSource[]): Record<string, BoardSource> {
  return Object.fromEntries(sources.map(source => [source.id, source]))
}

describe("orderBoardSourceIds", () => {
  it("sorts newly added cards first by default", () => {
    const sources = [
      createSource({ id: "test:old::1", provider: "Test", createdAt: 1 }),
      createSource({ id: "test:new::2", provider: "Test", createdAt: 3 }),
      createSource({ id: "test:middle::3", provider: "Test", createdAt: 2 }),
    ]

    expect(orderBoardSourceIds({
      sourceIds: sources.map(source => source.id),
      sourcesMap: createSourcesMap(sources),
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

    expect(orderBoardSourceIds({
      sourceIds: sources.map(source => source.id),
      sourcesMap: createSourcesMap(sources),
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

    expect(orderBoardSourceIds({
      sourceIds: sources.map(source => source.id),
      sourcesMap: createSourcesMap(sources),
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

    expect(orderBoardSourceIds({
      sourceIds: sources.map(source => source.id),
      sourcesMap: createSourcesMap(sources),
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
})
