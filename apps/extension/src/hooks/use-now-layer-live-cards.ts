import type { Atom } from "jotai"
import type { Board } from "@/lib/board"
import type { LiveCard } from "@/lib/source"
import type { SourceDescriptor } from "@/typings/source"
import { useAtomValue } from "jotai"
import { useMemo } from "react"
import { createSourcePlaceholder } from "@/lib/source"
import { boardsAtom, liveCardAtomsAtom, liveCardsAtom } from "@/store/board"

export interface NowLayerLiveCard {
  boardId: string
  descriptor: SourceDescriptor
  liveCardAtom: Atom<LiveCard>
}

interface NowLayerLiveCardsResult {
  currentBoard: Board
  liveCardsByCardId: Record<string, NowLayerLiveCard>
  cardIds: string[]
}

export function useNowLayerLiveCards(boardId: string): NowLayerLiveCardsResult {
  const boards = useAtomValue(boardsAtom)
  const liveCards = useAtomValue(liveCardsAtom)
  const liveCardAtoms = useAtomValue(liveCardAtomsAtom)
  const currentBoard = boards.find(board => board.id === boardId)!

  const { liveCardsByCardId } = useMemo(() => {
    // Render immediately with placeholders; each LiveCard resolves its own
    // descriptor on demand and upgrades via snapshot when it arrives.
    const liveCardsById = new Map<string, {
      card: LiveCard
      liveCardAtom: Atom<LiveCard>
    }>(liveCards.flatMap((card, index) => {
      const liveCardAtom = liveCardAtoms[index]
      return liveCardAtom
        ? [[card.cardId, { card, liveCardAtom }] as const]
        : []
    }))
    const nextLiveCards: Record<string, NowLayerLiveCard> = {}

    for (const card of currentBoard.nowLayer.liveCards) {
      const cardId = card.cardId
      const entry = liveCardsById.get(cardId)
      if (!entry) continue
      const { card: resolvedCard, liveCardAtom } = entry

      const descriptor = createSourcePlaceholder(resolvedCard.sourceId, resolvedCard.provider)

      nextLiveCards[cardId] = {
        boardId,
        descriptor,
        liveCardAtom,
      }
    }

    return {
      liveCardsByCardId: nextLiveCards,
    }
  }, [boardId, currentBoard.nowLayer.liveCards, liveCardAtoms, liveCards])

  const cardIds = useMemo(
    () => currentBoard.nowLayer.liveCards.map(card => card.cardId).filter(cardId => liveCardsByCardId[cardId] !== undefined),
    [currentBoard.nowLayer.liveCards, liveCardsByCardId],
  )

  return { currentBoard, liveCardsByCardId, cardIds }
}
