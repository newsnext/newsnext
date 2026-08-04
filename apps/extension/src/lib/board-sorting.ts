export interface BoardSortableSource {
  id: string
  createdAt?: number
  metadata: {
    title?: string
  }
  provider: {
    title: string
  }
}

export type AutomaticBoardSortMode = "createdAt" | "provider"
export type BoardSortMode = AutomaticBoardSortMode | "manual"

export interface BoardSortPreference {
  mode: BoardSortMode
  automaticMode: AutomaticBoardSortMode
  manualOrder: string[]
}

export const DEFAULT_BOARD_SORT_PREFERENCE: BoardSortPreference = {
  mode: "createdAt",
  automaticMode: "createdAt",
  manualOrder: [],
}

export function createBoardSortPreference(
  mode: BoardSortMode = DEFAULT_BOARD_SORT_PREFERENCE.mode,
): BoardSortPreference {
  return {
    mode,
    automaticMode: mode === "manual" ? "createdAt" : mode,
    manualOrder: [],
  }
}

export function updateBoardSortMode(
  preference: BoardSortPreference,
  mode: BoardSortMode,
): BoardSortPreference {
  return {
    ...preference,
    mode,
    automaticMode: mode === "manual" ? preference.automaticMode : mode,
  }
}

const nameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
})

function compareCreatedAt(left: BoardSortableSource, right: BoardSortableSource): number {
  const leftCreatedAt = Number.isFinite(left.createdAt) ? left.createdAt : undefined
  const rightCreatedAt = Number.isFinite(right.createdAt) ? right.createdAt : undefined

  if (leftCreatedAt === undefined) return rightCreatedAt === undefined ? 0 : 1
  if (rightCreatedAt === undefined) return -1
  return rightCreatedAt - leftCreatedAt
}

function compareSourceIds(left: BoardSortableSource, right: BoardSortableSource): number {
  return nameCollator.compare(left.id, right.id)
}

function compareByCreatedAt(left: BoardSortableSource, right: BoardSortableSource): number {
  return compareCreatedAt(left, right) || compareSourceIds(left, right)
}

function compareByProvider(left: BoardSortableSource, right: BoardSortableSource): number {
  const providerComparison = nameCollator.compare(
    left.provider.title,
    right.provider.title,
  )
  if (providerComparison !== 0) return providerComparison

  const leftTitle = left.metadata.title || left.provider.title
  const rightTitle = right.metadata.title || right.provider.title

  return nameCollator.compare(leftTitle, rightTitle)
    || compareCreatedAt(left, right)
    || compareSourceIds(left, right)
}

function sortAutomatically(
  sourceIds: string[],
  sourcesMap: Record<string, BoardSortableSource>,
  mode: AutomaticBoardSortMode,
): string[] {
  const comparator = mode === "provider" ? compareByProvider : compareByCreatedAt

  return sourceIds
    .flatMap((id) => {
      const source = sourcesMap[id]
      return source ? [{ id, source }] : []
    })
    .toSorted((left, right) => comparator(left.source, right.source))
    .map(({ id }) => id)
}

function reconcileManualOrder(manualOrder: string[], fallbackOrder: string[]): string[] {
  const sourceIdSet = new Set(fallbackOrder)
  const orderedIds = manualOrder.filter(id => sourceIdSet.has(id))
  const orderedIdSet = new Set(orderedIds)

  return [
    ...orderedIds,
    ...fallbackOrder.filter(id => !orderedIdSet.has(id)),
  ]
}

export function orderBoardSourceIds({
  sourceIds,
  sourcesMap,
  preference,
}: {
  sourceIds: string[]
  sourcesMap: Record<string, BoardSortableSource>
  preference: BoardSortPreference
}): string[] {
  const automaticOrder = sortAutomatically(
    sourceIds,
    sourcesMap,
    preference.mode === "manual" ? preference.automaticMode : preference.mode,
  )

  return preference.mode === "manual"
    ? reconcileManualOrder(preference.manualOrder, automaticOrder)
    : automaticOrder
}
