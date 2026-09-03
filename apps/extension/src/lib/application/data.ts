import type { Board } from "../board"
import type { Instance } from "../source"
import { createBoard, INITIAL_BOARD_NAME } from "../board"
import { createId } from "../id"

export const APPLICATION_DATA_VERSION = 5 as const

export interface ApplicationData {
  version: typeof APPLICATION_DATA_VERSION
  boards: Board[]
  instances: Instance[]
}

export interface InitialApplicationDataOptions {
  boardId?: string
  boardName?: string
  createdAt?: number
}

export function createEmptyApplicationData(): ApplicationData {
  return {
    version: APPLICATION_DATA_VERSION,
    boards: [],
    instances: [],
  }
}

export function createInitialApplicationData(
  options: InitialApplicationDataOptions = {},
): ApplicationData {
  const {
    boardId = createId(),
    boardName = INITIAL_BOARD_NAME,
    createdAt = Date.now(),
  } = options
  return {
    version: APPLICATION_DATA_VERSION,
    boards: [createBoard(boardId, boardName, createdAt)],
    instances: [],
  }
}

export function ensureApplicationDataIntegrity(
  data: ApplicationData,
  options: InitialApplicationDataOptions = {},
): ApplicationData {
  const initialized = data.boards.length > 0
    ? data
    : {
        ...createInitialApplicationData(options),
        instances: data.instances,
      }
  const assignedInstanceIds = new Set(initialized.boards.flatMap(board => board.instanceIds))
  const unassignedInstanceIds = initialized.instances
    .filter(instance => !assignedInstanceIds.has(instance.instanceId))
    .toSorted((left, right) => right.createdAt - left.createdAt || left.instanceId.localeCompare(right.instanceId))
    .map(instance => instance.instanceId)
  if (unassignedInstanceIds.length === 0) return initialized

  const fallbackBoard = initialized.boards[0]!
  const instanceIds = [...unassignedInstanceIds, ...fallbackBoard.instanceIds]
  return {
    ...initialized,
    boards: initialized.boards.map(board => board.id === fallbackBoard.id
      ? {
          ...board,
          instanceIds,
          nowLayer: {
            ...board.nowLayer,
            sort: {
              ...board.nowLayer.sort,
              manualOrder: [...unassignedInstanceIds, ...board.nowLayer.sort.manualOrder],
            },
          },
        }
      : board),
  }
}
