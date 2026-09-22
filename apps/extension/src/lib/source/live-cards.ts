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
  return applySourceDescriptor(liveCard, snapshot)
}

/** Rebase a card view onto a registry descriptor, preserving patch overrides. */
export function applySourceDescriptor(
  liveCard: LiveCardViewModel,
  descriptor: SourceDescriptor,
): LiveCardViewModel {
  return {
    ...descriptor,
    id: liveCard.id,
    sourceId: liveCard.sourceId,
    boardId: liveCard.boardId,
    createdAt: liveCard.createdAt,
    metadataValue: liveCard.metadataValue,
    paramsValue: liveCard.paramsValue,
    metadata: {
      ...descriptor.metadata,
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

export function createSourcePlaceholder(
  sourceId: string,
  provider?: SourceDescriptor["provider"],
): SourceDescriptor {
  const providerId = sourceId.split(":", 1)[0] || sourceId
  return {
    id: sourceId,
    version: 0,
    capabilities: { cookies: [], network: [] },
    metadata: { title: sourceId },
    provider: provider ?? {
      color: "slate",
      title: providerId,
    },
  }
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

  const descriptorsById = new Map(sources.map(source => [source.id, source]))
  const ordered = [...liveCardGroups.entries()].sort(([a], [b]) => a.localeCompare(b))
  return ordered.flatMap(([sourceId, cards]) => {
    // Missing definition: keep the card with a generic placeholder so it
    // explains itself instead of disappearing. Appearance snapshots upgrade
    // this placeholder once the load result arrives (see applySourceSnapshot).
    const source = descriptorsById.get(sourceId)
    return cards
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(card => createLiveCard(source ?? createSourcePlaceholder(sourceId, card.provider), card, boardId))
  })
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
