import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"
import { buildWidgetDataQueryKey, findLastWidgetData } from "./use-live-widget-data"

function seedWidgetData(
  queryClient: QueryClient,
  input: { cardIds: string[], dataRevision: string, params: Record<string, unknown>, widgetId: string },
  queries: Record<string, unknown>,
  updatedAt: number,
) {
  queryClient.setQueryData(buildWidgetDataQueryKey(input), {
    queries,
    refreshedAt: updatedAt,
    errors: [],
  }, { updatedAt })
}

const CARD = { cardIds: ["card-1"], widgetId: "feed" } as const

describe("findLastWidgetData", () => {
  it("returns the latest data for the exact definition version", () => {
    const queryClient = new QueryClient()
    seedWidgetData(
      queryClient,
      { ...CARD, cardIds: [...CARD.cardIds], dataRevision: "rev-1", params: {} },
      { items: [1] },
      100,
    )
    seedWidgetData(
      queryClient,
      { ...CARD, cardIds: [...CARD.cardIds], dataRevision: "rev-1", params: { topic: "x" } },
      { items: [2] },
      200,
    )
    seedWidgetData(
      queryClient,
      { ...CARD, cardIds: [...CARD.cardIds], dataRevision: "rev-2", params: {} },
      { items: [3] },
      300,
    )

    expect(findLastWidgetData(queryClient, "feed", "rev-1")).toEqual({ items: [2] })
    expect(findLastWidgetData(queryClient, "feed", "rev-2")).toEqual({ items: [3] })
  })

  it("ignores foreign-version data and other widgets", () => {
    const queryClient = new QueryClient()
    seedWidgetData(
      queryClient,
      { ...CARD, cardIds: [...CARD.cardIds], dataRevision: "rev-9", params: {} },
      { items: [1] },
      100,
    )
    seedWidgetData(
      queryClient,
      { ...CARD, cardIds: [...CARD.cardIds], widgetId: "other", dataRevision: "rev-1", params: {} },
      { items: [2] },
      200,
    )

    expect(findLastWidgetData(queryClient, "feed", "rev-1")).toBeUndefined()
  })
})
