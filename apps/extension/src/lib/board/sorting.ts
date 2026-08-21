export interface SortableNowLayerLiveCard {
  id: string
  metadata: {
    title?: string
  }
  provider: {
    title: string
  }
}

export type NowLayerAutomaticSortMode = "addedAt" | "provider"
export type NowLayerSortMode = NowLayerAutomaticSortMode | "manual"

export interface NowLayerSort {
  mode: NowLayerSortMode
  automaticMode: NowLayerAutomaticSortMode
  manualOrder: string[]
}

export const DEFAULT_NOW_LAYER_SORT: NowLayerSort = {
  mode: "addedAt",
  automaticMode: "addedAt",
  manualOrder: [],
}

export function createNowLayerSort(
  mode: NowLayerSortMode = DEFAULT_NOW_LAYER_SORT.mode,
): NowLayerSort {
  return {
    mode,
    automaticMode: mode === "manual" ? "addedAt" : mode,
    manualOrder: [],
  }
}

export function updateNowLayerSortMode(
  sort: NowLayerSort,
  mode: NowLayerSortMode,
): NowLayerSort {
  return {
    ...sort,
    mode,
    automaticMode: mode === "manual" ? sort.automaticMode : mode,
  }
}

const nameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
})

function compareByProvider(
  left: SortableNowLayerLiveCard,
  right: SortableNowLayerLiveCard,
): number {
  const providerComparison = nameCollator.compare(
    left.provider.title,
    right.provider.title,
  )
  if (providerComparison !== 0) return providerComparison

  const leftTitle = left.metadata.title || left.provider.title
  const rightTitle = right.metadata.title || right.provider.title
  return nameCollator.compare(leftTitle, rightTitle)
}

function sortByProvider(
  instanceIds: string[],
  liveCardsByInstanceId: Record<string, SortableNowLayerLiveCard>,
): string[] {
  const knownIds = instanceIds
    .flatMap((id, addedOrder) => {
      const liveCard = liveCardsByInstanceId[id]
      return liveCard ? [{ addedOrder, id, liveCard }] : []
    })
    .toSorted((left, right) => (
      compareByProvider(left.liveCard, right.liveCard)
      || left.addedOrder - right.addedOrder
    ))
    .map(({ id }) => id)
  const knownIdSet = new Set(knownIds)
  return [...knownIds, ...instanceIds.filter(id => !knownIdSet.has(id))]
}

function reconcileManualOrder(manualOrder: string[], fallbackOrder: string[]): string[] {
  const instanceIdSet = new Set(fallbackOrder)
  const orderedIds = manualOrder.filter(id => instanceIdSet.has(id))
  const orderedIdSet = new Set(orderedIds)

  return [
    ...orderedIds,
    ...fallbackOrder.filter(id => !orderedIdSet.has(id)),
  ]
}

export function orderNowLayerInstanceIds({
  instanceIds,
  liveCardsByInstanceId,
  sort,
}: {
  instanceIds: string[]
  liveCardsByInstanceId: Record<string, SortableNowLayerLiveCard>
  sort: NowLayerSort
}): string[] {
  const automaticMode = sort.mode === "manual" ? sort.automaticMode : sort.mode
  const automaticOrder = automaticMode === "provider"
    ? sortByProvider(instanceIds, liveCardsByInstanceId)
    : instanceIds

  return sort.mode === "manual"
    ? reconcileManualOrder(sort.manualOrder, automaticOrder)
    : automaticOrder
}
