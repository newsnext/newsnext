const sortableDataKey = Symbol("sortable-data")

export type SortableKind = "card" | "widget"

interface SortableData {
  kind: SortableKind
  boardId?: string
  widgetId?: string
  [key: string]: unknown
  [key: symbol]: unknown
  [sortableDataKey]: true
  id: string
  cardId: string
}

export function getSortableData({ id, cardId, kind = "card", boardId, widgetId }: { id: string, cardId: string, kind?: SortableKind, boardId?: string, widgetId?: string }): SortableData {
  return {
    [sortableDataKey]: true,
    kind,
    boardId,
    widgetId,
    id,
    cardId,
  }
}

export function isSortableData(data: Record<string | symbol, unknown>, kind: SortableKind = "card"): data is SortableData {
  return data[sortableDataKey] === true
    && data.kind === kind
    && typeof data.id === "string"
    && typeof data.cardId === "string"
}

export type SortableRemovalTarget
  = | { kind: "card", cardId: string }
    | { kind: "widget", boardId: string, widgetId: string }

export function getSortableRemovalTarget(data: Record<string | symbol, unknown>): SortableRemovalTarget | undefined {
  if (isSortableData(data)) return { kind: "card", cardId: data.id }
  if (isSortableData(data, "widget")
    && typeof data.boardId === "string" && data.boardId.length > 0
    && typeof data.widgetId === "string" && data.widgetId.length > 0) {
    return { kind: "widget", boardId: data.boardId, widgetId: data.widgetId }
  }
  return undefined
}
