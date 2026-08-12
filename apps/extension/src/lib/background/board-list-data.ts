import type { Board } from "../board"
import type { SourceInstance } from "../source"

export interface ListedBoard extends Board {
  instances: SourceInstance[]
}

export interface BoardListResult {
  boards: ListedBoard[]
  totalInstanceCount: number
  unassignedInstances: SourceInstance[]
}

export function groupInstancesByBoard(
  boards: Board[],
  instances: SourceInstance[],
): BoardListResult {
  const boardIds = new Set(boards.map(board => board.id))
  const instancesByBoardId = new Map<string, SourceInstance[]>()
  const unassignedInstances: SourceInstance[] = []

  for (const instance of instances) {
    if (instance.boardId === null || !boardIds.has(instance.boardId)) {
      unassignedInstances.push(instance)
      continue
    }
    const grouped = instancesByBoardId.get(instance.boardId) ?? []
    grouped.push(instance)
    instancesByBoardId.set(instance.boardId, grouped)
  }

  return {
    boards: boards.map(board => ({
      ...board,
      instances: instancesByBoardId.get(board.id) ?? [],
    })),
    totalInstanceCount: instances.length,
    unassignedInstances,
  }
}
