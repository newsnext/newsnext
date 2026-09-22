import type { SourcePatch, SourcePresentationMetadata, SourceProvider } from "./source.js"

export interface LiveCard {
  cardId: string
  workerId: string
  sourceId: string
  /** Immutable provider presentation captured when the LiveCard is created. */
  provider: SourceProvider
  patch: LiveCardPatch
  createdAt: number
}

export type LiveCardMetadata = SourcePresentationMetadata

export type LiveCardPatch = SourcePatch<
  Record<string, unknown>,
  LiveCardMetadata
>
