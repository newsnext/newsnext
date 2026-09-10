import type { LiveCard, LiveCardPatch } from "@newsnext/sdk/models"
import type {
  SourcePresentationMetadata,
} from "@newsnext/source-kit/types"
import type { LiveCardViewModel, SourceDescriptor } from "@/typings/source"
import { SOURCE_PRESENTATION_METADATA_KEYS } from "@newsnext/source-kit"
import { pick } from "es-toolkit"
import { mergeSourceParamValues } from "./params"

export type { LiveCard, LiveCardMetadata, LiveCardPatch } from "@newsnext/sdk/models"

export function mergeLiveCardPatch(
  current: LiveCardPatch | undefined,
  patch: LiveCardPatch,
): LiveCardPatch {
  return {
    params: current?.params || patch.params
      ? mergeSourceParamValues(current?.params, patch.params)
      : undefined,
    metadata: current?.metadata || patch.metadata
      ? { ...current?.metadata, ...patch.metadata }
      : undefined,
  }
}

export function applyLiveCardPatch(
  liveCard: LiveCardViewModel,
  patch: LiveCardPatch,
): LiveCardViewModel {
  const metadata = pick(patch.metadata ?? {}, SOURCE_PRESENTATION_METADATA_KEYS)

  return {
    ...liveCard,
    metadata: {
      ...liveCard.metadata,
      ...metadata,
    },
    metadataValue: metadata,
    paramsValue: patch.params,
  }
}

function applyLiveCardOverrides(
  liveCard: LiveCardViewModel,
  card: LiveCard,
): LiveCardViewModel {
  return {
    ...applyLiveCardPatch(liveCard, card.patch),
    createdAt: card.createdAt,
  }
}

export function applySourceSnapshot(
  liveCard: LiveCardViewModel,
  snapshot: SourceDescriptor,
): LiveCardViewModel {
  return {
    ...snapshot,
    id: liveCard.id,
    sourceId: liveCard.sourceId,
    boardId: liveCard.boardId,
    createdAt: liveCard.createdAt,
    metadataValue: liveCard.metadataValue,
    paramsValue: liveCard.paramsValue,
    metadata: {
      ...snapshot.metadata,
      ...liveCard.metadataValue,
    },
  }
}

export function createLiveCard(
  source: SourceDescriptor,
  card: LiveCard,
  boardId: string | null = null,
): LiveCardViewModel {
  return applyLiveCardOverrides({
    ...source,
    id: card.cardId,
    sourceId: card.sourceId,
    boardId,
  }, card)
}

export function buildLiveCards({
  sources,
  liveCards,
  boardId,
  boardCardIds,
}: {
  sources: SourceDescriptor[]
  liveCards: LiveCard[]
  boardId: string | null
  boardCardIds?: readonly string[]
}): LiveCardViewModel[] {
  const liveCardGroups = new Map<string, LiveCard[]>()
  const visibleIds = boardCardIds ? new Set(boardCardIds) : undefined

  liveCards.forEach((card) => {
    if (visibleIds && !visibleIds.has(card.cardId)) {
      return
    }

    const currentLiveCards = liveCardGroups.get(card.sourceId) ?? []
    currentLiveCards.push(card)
    liveCardGroups.set(card.sourceId, currentLiveCards)
  })

  return sources.flatMap(source =>
    (liveCardGroups.get(source.id) ?? [])
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(card => createLiveCard(source, card, boardId)),
  )
}

export function applySourceLoaderMetadata(
  liveCard: LiveCardViewModel,
  metadata: SourcePresentationMetadata | undefined,
): LiveCardViewModel {
  if (!metadata) {
    return liveCard
  }

  return {
    ...liveCard,
    metadata: {
      ...liveCard.metadata,
      ...metadata,
    },
  }
}
