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
  sourceId: string
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
  sourceId,
}: LiveCardReorderInput): number {
  const sourceIndex = items.findIndex(item => item.id === sourceId)
  if (sourceIndex === -1) return 0

  const rows = groupVisualRows(items)
  const targetRow = rows.reduce<LiveCardLayoutItem[] | null>((closestRow, row) => {
    if (!closestRow) return row
    return getDistanceToRow(pointer.y, row) < getDistanceToRow(pointer.y, closestRow)
      ? row
      : closestRow
  }, null)
  if (!targetRow) return 0

  const remainingItems = items.filter(item => item.id !== sourceId)
  const rowTargets = targetRow.filter(item => item.id !== sourceId)
  if (rowTargets.length === 0) {
    return sourceIndex
  }

  const itemBeforePointer = rowTargets.find(item => pointer.x < (item.left + item.right) / 2)
  if (itemBeforePointer) {
    return remainingItems.findIndex(item => item.id === itemBeforePointer.id)
  }

  const lastRowItem = rowTargets.at(-1)
  if (!lastRowItem) return sourceIndex
  return remainingItems.findIndex(item => item.id === lastRowItem.id) + 1
}

export function reorderLiveCard(instanceIds: string[], sourceId: string, destinationIndex: number): string[] {
  if (!instanceIds.includes(sourceId)) return instanceIds
  const remainingInstanceIds = instanceIds.filter(id => id !== sourceId)
  remainingInstanceIds.splice(destinationIndex, 0, sourceId)
  return remainingInstanceIds
}
