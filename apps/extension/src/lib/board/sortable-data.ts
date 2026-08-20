const sortableDataKey = Symbol("sortable-data")

interface SortableData {
  [key: string]: unknown
  [key: symbol]: unknown
  [sortableDataKey]: true
  id: string
  ids: string[]
  instanceId: string
}

export function getSortableData({ id, ids, instanceId }: { id: string, ids: string[], instanceId: string }): SortableData {
  return {
    [sortableDataKey]: true,
    id,
    ids,
    instanceId,
  }
}

export function isSortableData(data: Record<string | symbol, unknown>): data is SortableData {
  return data[sortableDataKey] === true
    && typeof data.id === "string"
    && Array.isArray(data.ids)
    && data.ids.length > 0
    && data.ids.every(id => typeof id === "string")
    && new Set(data.ids).size === data.ids.length
    && data.ids.includes(data.id)
    && typeof data.instanceId === "string"
}
