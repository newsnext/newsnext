import type { SourcePresentationMetadata } from "@newsnext/source/types"
import type { NewsItem } from "@/typings/source"
import { stableStringify } from "@newsnext/shared/utils"
import { isTimelineItems } from "./source-presentation"

export const SOURCE_HISTORY_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
export const SOURCE_HISTORY_MAX_BYTES = 100 * 1024 * 1024

export type SourceHistoryKind = "ranking" | "timeline"

export function buildSourceHistoryDatasetKey(
  sourceId: string,
  params: Record<string, unknown>,
): string {
  return `${sourceId}:${stableStringify(params)}`
}

export function buildSourceHistoryItemIdentity(providerId: string, url: string): [string, string] {
  return [providerId, url]
}

export function getSourceHistoryKind(items: readonly NewsItem[]): SourceHistoryKind {
  return isTimelineItems(items) ? "timeline" : "ranking"
}

export function buildSourceHistorySnapshotIdentity(
  kind: SourceHistoryKind,
  itemRevisionIds: readonly number[],
  metadata?: SourcePresentationMetadata,
): string {
  return stableStringify({ itemRevisionIds, kind, metadata })
}
