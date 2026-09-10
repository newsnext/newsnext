import type { RuntimeSource } from "@newsnext/source-kit/types"
import { normalizeSourceParams } from "@newsnext/source-kit/runtime"
import { hashKey } from "@tanstack/react-query"

export const SOURCE_QUERY_KEY = ["source"] as const
export const LIVE_CARD_QUERY_KEY = ["card"] as const

export interface LiveCardQueryTarget {
  cardId: string
}

export interface DraftSourceQueryTarget {
  params: Record<string, unknown>
  sourceId: string
  version: number
}

export type SourceQueryTarget = LiveCardQueryTarget | DraftSourceQueryTarget

export function createLiveCardQueryTarget(
  cardId: string,
): LiveCardQueryTarget {
  return { cardId }
}

export function createSourceQueryTarget(
  sourceId: string,
  source: Pick<RuntimeSource, "params" | "version">,
  params: Record<string, unknown> = {},
): DraftSourceQueryTarget {
  return {
    params: normalizeSourceParams(source, params),
    sourceId,
    version: source.version,
  }
}

export function getSourceQueryKey(
  target: SourceQueryTarget,
): readonly ["card", string]
  | readonly ["source", string, number, Record<string, unknown>] {
  if ("cardId" in target) {
    return [...LIVE_CARD_QUERY_KEY, target.cardId]
  }
  return [
    ...SOURCE_QUERY_KEY,
    target.sourceId,
    target.version,
    target.params,
  ]
}

export function getSourceQueryHash(target: SourceQueryTarget): string {
  return hashKey(getSourceQueryKey(target))
}
