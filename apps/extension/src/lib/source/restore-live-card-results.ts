import type { QueryClient } from "@tanstack/react-query"
import type { LiveCard } from "./live-cards"
import { actions } from "../actions"
import { createLiveCardQueryTarget, getSourceQueryKey } from "./query-target"

export async function restoreLiveCardResults(
  queryClient: QueryClient,
  liveCards: readonly Pick<LiveCard, "cardId" | "sourceId">[],
): Promise<void> {
  await Promise.allSettled(liveCards.map(async (card) => {
    const response = await actions.liveCard.readCache({
      cardId: card.cardId,
    })
    if (!response) return
    if (response.result.source.id !== card.sourceId) {
      throw new Error(`LiveCard '${card.cardId}' returned the wrong Source`)
    }
    queryClient.setQueryData(
      getSourceQueryKey(createLiveCardQueryTarget(card.cardId)),
      response,
      { updatedAt: response.fetchedAt },
    )
  }))
}
