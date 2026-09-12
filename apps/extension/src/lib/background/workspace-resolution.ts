import type { WorkspaceSummary } from "@newsnext/sdk/models"
import type { Workspace } from "@/lib/native-protocol/Workspace"
import { stableStringify } from "@newsnext/shared/utils"

export function summarizeWorkspace(workspace: Workspace): WorkspaceSummary {
  return {
    boards: workspace.boards.length,
    liveCards: workspace.liveCards.length,
    liveWidgets: workspace.boards.reduce((count, board) => count + board.nextLayer.liveWidgets.length, 0),
  }
}

export function needsWorkspaceResolution(local: Workspace, shared: Workspace, syncedAt: number | undefined): boolean {
  if (syncedAt !== undefined && local.updatedAt <= syncedAt) return false
  return stableStringify({ boards: local.boards, liveCards: local.liveCards, settings: JSON.parse(local.settings) })
    !== stableStringify({ boards: shared.boards, liveCards: shared.liveCards, settings: JSON.parse(shared.settings) })
}

// Shared IDs retain their content and Board ownership. Local-only entities are
// appended without changing Worker ownership or collapsing Widget definitions.
export function mergeWorkspaces(shared: Workspace, local: Workspace): Workspace {
  const result = structuredClone(shared)
  const boardMap = new Map(result.boards.map(board => [board.id, board]))
  const cardIds = new Set(shared.liveCards.map(card => card.cardId))
  const widgetIds = new Set(shared.boards.flatMap(board => board.nextLayer.liveWidgets.map(widget => widget.liveWidgetId)))
  result.liveCards.push(...structuredClone(local.liveCards.filter(card => !cardIds.has(card.cardId))))
  for (const localBoard of local.boards) {
    let board = boardMap.get(localBoard.id)
    if (!board) {
      board = structuredClone(localBoard)
      board.cardIds = []
      board.nextLayer.liveWidgets = []
      result.boards.push(board)
      boardMap.set(board.id, board)
    }
    board.cardIds.push(...localBoard.cardIds.filter(id => !cardIds.has(id)))
    const ownedCards = new Set(board.cardIds)
    for (const widget of localBoard.nextLayer.liveWidgets) {
      if (widgetIds.has(widget.liveWidgetId)) continue
      const added = structuredClone(widget)
      if (added.dataScope.type === "cards") {
        added.dataScope.cardIds = added.dataScope.cardIds.filter(id => ownedCards.has(id))
      }
      board.nextLayer.liveWidgets.push(added)
      widgetIds.add(added.liveWidgetId)
    }
    board.nowLayer.sort.manualOrder = [...new Set([
      ...board.nowLayer.sort.manualOrder,
      ...localBoard.nowLayer.sort.manualOrder,
    ])].filter(id => ownedCards.has(id))
    for (const id of board.cardIds) cardIds.add(id)
  }
  return result
}
