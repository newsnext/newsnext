import type { SourcePresentationMetadata } from "@newsnext/source/types"
import type { SourceHistoryKind } from "./source-history-values"
import type { NewsItem } from "@/typings/source"
import { stableStringify } from "@newsnext/shared/utils"

export interface SourceHistoryItemIdentity {
  providerId: string
  url: string
}

export interface SourceHistoryObservedItem {
  identity: SourceHistoryItemIdentity
  position: number
  value: NewsItem
}

export interface HydratedSourceHistoryObservation {
  items: SourceHistoryObservedItem[]
  kind: SourceHistoryKind
  metadata?: SourcePresentationMetadata
  observedAt: number
  sourceVersion: number
}

export interface SourceHistoryItemUpdate {
  after: SourceHistoryObservedItem
  before: SourceHistoryObservedItem
  changedFields: string[]
  identity: SourceHistoryItemIdentity
}

export interface SourceHistoryItemMovement {
  afterPosition: number
  beforePosition: number
  identity: SourceHistoryItemIdentity
}

export interface SourceHistoryObservationDiff {
  added: SourceHistoryObservedItem[]
  afterObservedAt: number
  beforeObservedAt: number
  missing: SourceHistoryObservedItem[]
  moved: SourceHistoryItemMovement[]
  updated: SourceHistoryItemUpdate[]
}

export function compareSourceHistoryObservationValues(
  before: HydratedSourceHistoryObservation,
  after: HydratedSourceHistoryObservation,
): SourceHistoryObservationDiff {
  const beforeItems = new Map(before.items.map(item => [buildItemIdentityKey(item.identity), item]))
  const afterItems = new Map(after.items.map(item => [buildItemIdentityKey(item.identity), item]))
  const added = after.items.filter(item => !beforeItems.has(buildItemIdentityKey(item.identity)))
  const missing = before.items.filter(item => !afterItems.has(buildItemIdentityKey(item.identity)))
  const moved: SourceHistoryItemMovement[] = []
  const updated: SourceHistoryItemUpdate[] = []

  for (const afterItem of after.items) {
    const beforeItem = beforeItems.get(buildItemIdentityKey(afterItem.identity))
    if (!beforeItem) continue
    if (beforeItem.position !== afterItem.position) {
      moved.push({
        afterPosition: afterItem.position,
        beforePosition: beforeItem.position,
        identity: afterItem.identity,
      })
    }
    const changedFields = getChangedNewsItemFields(beforeItem.value, afterItem.value)
    if (changedFields.length) {
      updated.push({
        after: afterItem,
        before: beforeItem,
        changedFields,
        identity: afterItem.identity,
      })
    }
  }

  return {
    added,
    afterObservedAt: after.observedAt,
    beforeObservedAt: before.observedAt,
    missing,
    moved,
    updated,
  }
}

function buildItemIdentityKey(identity: SourceHistoryItemIdentity): string {
  return stableStringify([identity.providerId, identity.url])
}

function getChangedNewsItemFields(before: NewsItem, after: NewsItem): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  return [...keys]
    .filter(key => stableStringify(before[key as keyof NewsItem])
      !== stableStringify(after[key as keyof NewsItem]))
    .sort()
}
