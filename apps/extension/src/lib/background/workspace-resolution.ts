import type { WorkspaceSummary } from "@newsnext/sdk/models"
import type { Workspace } from "@/lib/native-protocol/Workspace"
import { stableStringify } from "@newsnext/shared/utils"

export function summarizeWorkspace(workspace: Workspace): WorkspaceSummary {
  return {
    boards: workspace.boardOrder.length,
    liveCards: Object.keys(workspace.liveCards).length,
    liveWidgets: Object.keys(workspace.liveWidgets).length,
  }
}

export function needsWorkspaceResolution(local: Workspace, shared: Workspace, syncedAt: number | undefined): boolean {
  if (syncedAt !== undefined && local.updatedAt <= syncedAt) return false
  return stableStringify({ boardOrder: local.boardOrder, boards: local.boards, liveCards: local.liveCards, liveWidgets: local.liveWidgets, settings: JSON.parse(local.settings) })
    !== stableStringify({ boardOrder: shared.boardOrder, boards: shared.boards, liveCards: shared.liveCards, liveWidgets: shared.liveWidgets, settings: JSON.parse(shared.settings) })
}

// Shared IDs retain their content and Board ownership. Local-only entities are
// appended without changing Worker ownership or collapsing Widget definitions.
export function mergeWorkspaces(shared: Workspace, local: Workspace): Workspace {
  const result = structuredClone(shared)
  const cardIds = new Set(Object.keys(shared.liveCards))
  const widgetIds = new Set(Object.keys(shared.liveWidgets))
  for (const boardId of local.boardOrder) {
    const localBoard = local.boards[boardId]!
    let board = result.boards[boardId]
    if (!board) {
      board = structuredClone(localBoard)
      board.nowLayer.liveCards = []
      board.nextLayer.liveWidgets = []
      result.boards[boardId] = board
      result.boardOrder.push(boardId)
    }
    board.nowLayer.liveCards.push(...localBoard.nowLayer.liveCards.filter(id => !cardIds.has(id)))
    for (const cardId of localBoard.nowLayer.liveCards) {
      if (!cardIds.has(cardId) && local.liveCards[cardId]) result.liveCards[cardId] = structuredClone(local.liveCards[cardId])
    }
    const ownedCards = new Set(board.nowLayer.liveCards)
    for (const widgetId of localBoard.nextLayer.liveWidgets) {
      if (widgetIds.has(widgetId)) continue
      const localWidget = local.liveWidgets[widgetId]
      if (!localWidget) continue
      const added = structuredClone(localWidget)
      if (added.dataScope.type === "cards") {
        added.dataScope.cardIds = added.dataScope.cardIds.filter(id => ownedCards.has(id))
      }
      result.liveWidgets[widgetId] = added
      board.nextLayer.liveWidgets.push(widgetId)
      widgetIds.add(widgetId)
    }
    for (const id of board.nowLayer.liveCards) cardIds.add(id)
  }
  return result
}
