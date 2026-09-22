import type { ApplicationData } from "../../application"
import type { Workspace as NativeWorkspace } from "@/lib/native-protocol/Workspace"
import { APPLICATION_DATA_VERSION } from "../../application"
import { normalizeApplicationData } from "../../settings/persisted-data"

type NativeWorkspaceData = Pick<NativeWorkspace, "boardOrder" | "boards" | "liveCards" | "liveWidgets">

export function toNativeWorkspaceData(data: ApplicationData): NativeWorkspaceData {
  return {
    boardOrder: data.boardOrder,
    boards: Object.fromEntries(Object.entries(data.boards).map(([boardId, board]) => [boardId, { ...board, id: boardId }])),
    liveCards: Object.fromEntries(Object.entries(data.liveCards).map(([cardId, card]) => [cardId, { ...card, cardId }])),
    liveWidgets: Object.fromEntries(Object.entries(data.liveWidgets).map(([liveWidgetId, widget]) => [liveWidgetId, { ...widget, liveWidgetId }])),
  }
}

export function fromNativeWorkspaceData(data: NativeWorkspaceData): ApplicationData {
  return normalizeApplicationData({
    version: APPLICATION_DATA_VERSION,
    boardOrder: data.boardOrder,
    boards: data.boards,
    liveCards: data.liveCards,
    liveWidgets: data.liveWidgets,
  })
}
