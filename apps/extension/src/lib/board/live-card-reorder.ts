export interface LiveCardLayoutItem {
  bottom: number
  id: string
  left: number
  right: number
  top: number
}

interface LiveCardReorderInput {
  items: LiveCardLayoutItem[]
  pointer: {
    x: number
    y: number
  }
  sourceIds: string[]
}

interface LiveCardMarqueeSelectionInput {
  initialIds?: string[]
  items: LiveCardLayoutItem[]
  marquee: {
    bottom: number
    left: number
    right: number
    top: number
  }
}

function isSameVisualRow(first: LiveCardLayoutItem, second: LiveCardLayoutItem): boolean {
  const overlap = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top)
  const shortestHeight = Math.min(first.bottom - first.top, second.bottom - second.top)
  return overlap > shortestHeight / 2
}

function groupVisualRows(items: LiveCardLayoutItem[]): LiveCardLayoutItem[][] {
  return items.reduce<LiveCardLayoutItem[][]>((rows, item) => {
    const currentRow = rows.at(-1)
    const rowAnchor = currentRow?.[0]
    if (!currentRow || !rowAnchor || !isSameVisualRow(rowAnchor, item)) {
      rows.push([item])
    } else {
      currentRow.push(item)
    }
    return rows
  }, [])
}

function getDistanceToRow(pointerY: number, row: LiveCardLayoutItem[]): number {
  const top = Math.min(...row.map(item => item.top))
  const bottom = Math.max(...row.map(item => item.bottom))
  if (pointerY < top) return top - pointerY
  if (pointerY > bottom) return pointerY - bottom
  return 0
}

export function getLiveCardReorderDestinationIndex({
  items,
  pointer,
  sourceIds,
}: LiveCardReorderInput): number {
  const sourceIdSet = new Set(sourceIds)
  const sourceIndex = items.findIndex(item => sourceIdSet.has(item.id))
  if (sourceIndex === -1) return 0

  const rows = groupVisualRows(items)
  const targetRow = rows.reduce<LiveCardLayoutItem[] | null>((closestRow, row) => {
    if (!closestRow) return row
    return getDistanceToRow(pointer.y, row) < getDistanceToRow(pointer.y, closestRow)
      ? row
      : closestRow
  }, null)
  if (!targetRow) return 0

  const remainingItems = items.filter(item => !sourceIdSet.has(item.id))
  const rowTargets = targetRow.filter(item => !sourceIdSet.has(item.id))
  if (rowTargets.length === 0) {
    return items.slice(0, sourceIndex).filter(item => !sourceIdSet.has(item.id)).length
  }

  const itemBeforePointer = rowTargets.find(item => pointer.x < (item.left + item.right) / 2)
  if (itemBeforePointer) {
    return remainingItems.findIndex(item => item.id === itemBeforePointer.id)
  }

  const lastRowItem = rowTargets.at(-1)
  if (!lastRowItem) return sourceIndex
  return remainingItems.findIndex(item => item.id === lastRowItem.id) + 1
}

export function reorderLiveCardGroup(instanceIds: string[], sourceIds: string[], destinationIndex: number): string[] {
  const sourceIdSet = new Set(sourceIds)
  const draggedInstanceIds = instanceIds.filter(id => sourceIdSet.has(id))
  const remainingInstanceIds = instanceIds.filter(id => !sourceIdSet.has(id))
  remainingInstanceIds.splice(destinationIndex, 0, ...draggedInstanceIds)
  return remainingInstanceIds
}

export function restoreUnavailableInstanceSlots(
  collectionInstanceIds: string[],
  visibleInstanceIds: string[],
): string[] {
  const visibleInstanceIdSet = new Set(visibleInstanceIds)
  let visibleIndex = 0

  return collectionInstanceIds.map(instanceId => (
    visibleInstanceIdSet.has(instanceId)
      ? visibleInstanceIds[visibleIndex++]!
      : instanceId
  ))
}

export function getLiveCardMarqueeSelection({
  initialIds = [],
  items,
  marquee,
}: LiveCardMarqueeSelectionInput): string[] {
  const selectedIds = new Set(initialIds)
  items.forEach((item) => {
    const intersects = marquee.left < item.right
      && marquee.right > item.left
      && marquee.top < item.bottom
      && marquee.bottom > item.top
    if (intersects) selectedIds.add(item.id)
  })
  return items.flatMap(item => selectedIds.has(item.id) ? [item.id] : [])
}
