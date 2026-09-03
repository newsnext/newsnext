const sortableDataKey = Symbol("sortable-data")

interface SortableData {
  [key: string]: unknown
  [key: symbol]: unknown
  [sortableDataKey]: true
  id: string
  instanceId: string
}

export function getSortableData({ id, instanceId }: { id: string, instanceId: string }): SortableData {
  return {
    [sortableDataKey]: true,
    id,
    instanceId,
  }
}

export function isSortableData(data: Record<string | symbol, unknown>): data is SortableData {
  return data[sortableDataKey] === true
    && typeof data.id === "string"
    && typeof data.instanceId === "string"
}
