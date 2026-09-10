import type { SourcePatch, SourcePresentationMetadata } from "./source.js"

export interface LiveCard {
  cardId: string
  workerId: string
  sourceId: string
  patch: LiveCardPatch
  createdAt: number
}

export type LiveCardMetadata = SourcePresentationMetadata

export type LiveCardPatch = SourcePatch<
  Record<string, unknown>,
  LiveCardMetadata
>
