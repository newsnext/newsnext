import type { Atom } from "jotai"
import type { Board } from "@/lib/board"
import type { LiveCard } from "@/lib/source"
import type { SourceDescriptor } from "@/typings/source"
import { useAtomValue } from "jotai"
import { useMemo } from "react"
import { boardsAtom, liveCardAtomsAtom, liveCardsAtom } from "@/store/board"
import { useSourceDescriptors } from "./use-source-descriptors"

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

function createSourcePlaceholder(sourceId: string): SourceDescriptor {
  const providerId = sourceId.split(":", 1)[0] || sourceId
  return {
    id: sourceId,
    version: 0,
    capabilities: { cookies: [], network: [] },
    metadata: { title: sourceId },
    provider: {
      color: "slate",
      title: providerId,
    },
  }
}

export function useNowLayerLiveCards(boardId: string): NowLayerLiveCardsResult {
  const boards = useAtomValue(boardsAtom)
  const liveCards = useAtomValue(liveCardsAtom)
  const liveCardAtoms = useAtomValue(liveCardAtomsAtom)
  const currentBoard = boards.find(board => board.id === boardId)!
  const { sources } = useSourceDescriptors()

  const { liveCardsByCardId } = useMemo(() => {
    const descriptorsById = new Map(sources.map(source => [source.id, source]))
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

    for (const cardId of currentBoard.nowLayer.liveCards) {
      const entry = liveCardsById.get(cardId)
      if (!entry) continue
      const { card, liveCardAtom } = entry

      const descriptor = descriptorsById.get(card.sourceId)
        ?? createSourcePlaceholder(card.sourceId)

      nextLiveCards[cardId] = {
        boardId,
        descriptor,
        liveCardAtom,
      }
    }

    return {
      liveCardsByCardId: nextLiveCards,
    }
  }, [boardId, currentBoard.nowLayer.liveCards, liveCardAtoms, liveCards, sources])

  const cardIds = useMemo(
    () => currentBoard.nowLayer.liveCards.filter(cardId => liveCardsByCardId[cardId] !== undefined),
    [currentBoard.nowLayer.liveCards, liveCardsByCardId],
  )

  return { currentBoard, liveCardsByCardId, cardIds }
}
