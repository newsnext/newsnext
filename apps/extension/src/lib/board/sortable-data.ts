const sortableDataKey = Symbol("sortable-data")

export type SortableKind = "instance" | "widget"

interface SortableData {
  kind: SortableKind
  boardId?: string
  widgetId?: string
  [key: string]: unknown
  [key: symbol]: unknown
  [sortableDataKey]: true
  id: string
  instanceId: string
}

export function getSortableData({ id, instanceId, kind = "instance", boardId, widgetId }: { id: string, instanceId: string, kind?: SortableKind, boardId?: string, widgetId?: string }): SortableData {
  return {
    [sortableDataKey]: true,
    kind,
    boardId,
    widgetId,
    id,
    instanceId,
  }
}

export function isSortableData(data: Record<string | symbol, unknown>, kind: SortableKind = "instance"): data is SortableData {
  return data[sortableDataKey] === true
    && data.kind === kind
    && typeof data.id === "string"
    && typeof data.instanceId === "string"
}

export type SortableRemovalTarget
  = | { kind: "instance", instanceId: string }
    | { kind: "widget", boardId: string, widgetId: string }

export function getSortableRemovalTarget(data: Record<string | symbol, unknown>): SortableRemovalTarget | undefined {
  if (isSortableData(data)) return { kind: "instance", instanceId: data.id }
  if (isSortableData(data, "widget")
    && typeof data.boardId === "string" && data.boardId.length > 0
    && typeof data.widgetId === "string" && data.widgetId.length > 0) {
    return { kind: "widget", boardId: data.boardId, widgetId: data.widgetId }
  }
  return undefined
}
