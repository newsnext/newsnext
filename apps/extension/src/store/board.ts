import type { Board } from "../lib/boards"
import type { SourceInstance, SourceInstancePatch } from "../lib/source-cards"
import { atom } from "jotai"
import { atomWithStorage, selectAtom, splitAtom } from "jotai/utils"
import { ALL_BOARD_ID, createAllBoard, getBoardColor } from "../lib/boards"
import {
  normalizeBoards,
  normalizeSourceInstances,
  PERSISTED_DATA_SLICES,
} from "../lib/persisted-data"
import { mergeSourceInstancePatch } from "../lib/source-cards"
import { createMirroredStorage } from "./persisted-storage"
import { allBoardColorAtom, currentBoardIdAtom, defaultBoardIdAtom } from "./settings"

const persistedBoardsAtom = atomWithStorage<Board[]>(
  PERSISTED_DATA_SLICES.boards.key,
  [],
  createMirroredStorage({
    defaultValue: () => [],
    key: PERSISTED_DATA_SLICES.boards.key,
    normalize: normalizeBoards,
  }),
  { getOnInit: true },
)

type BoardsUpdate = Board[] | ((boards: Board[]) => Board[])

export const boardsAtom = atom(
  get => [createAllBoard(get(allBoardColorAtom)), ...get(persistedBoardsAtom)],
  (get, set, update: BoardsUpdate) => {
    const boards = get(boardsAtom)
    const nextBoards = typeof update === "function" ? update(boards) : update
    set(persistedBoardsAtom, normalizeBoards(nextBoards))
  },
)

export const instancesAtom = atomWithStorage<SourceInstance[]>(
  PERSISTED_DATA_SLICES.instances.key,
  [],
  createMirroredStorage({
    defaultValue: () => [],
    key: PERSISTED_DATA_SLICES.instances.key,
    normalize: normalizeSourceInstances,
  }),
  { getOnInit: true },
)

export interface SourceInstanceLayout {
  boardId: string | null
  createdAt: number
  instanceId: string
  sourceId: string
  title?: string
}

function selectInstanceLayouts(instances: SourceInstance[]): SourceInstanceLayout[] {
  return instances.map(instance => ({
    boardId: instance.boardId,
    createdAt: instance.createdAt,
    instanceId: instance.instanceId,
    sourceId: instance.sourceId,
    title: instance.patch.metadata?.title,
  }))
}

function areInstanceLayoutsEqual(
  left: SourceInstanceLayout[],
  right: SourceInstanceLayout[],
): boolean {
  return left.length === right.length && left.every((layout, index) => {
    const candidate = right[index]
    return candidate !== undefined
      && layout.boardId === candidate.boardId
      && layout.createdAt === candidate.createdAt
      && layout.instanceId === candidate.instanceId
      && layout.sourceId === candidate.sourceId
      && layout.title === candidate.title
  })
}

export const instanceAtomsAtom = splitAtom(
  instancesAtom,
  instance => instance.instanceId,
)

export const instanceLayoutsAtom = selectAtom(
  instancesAtom,
  selectInstanceLayouts,
  areInstanceLayoutsEqual,
)

export const setManualBoardOrderAtom = atom(null, (_get, set, {
  boardId,
  sourceIds,
}: {
  boardId: string
  sourceIds: string[]
}) => {
  if (boardId === ALL_BOARD_ID) {
    return
  }

  set(boardsAtom, boards => boards.map(board => board.id === boardId
    ? {
        ...board,
        sort: {
          ...board.sort,
          mode: "manual",
          manualOrder: sourceIds,
        },
      }
    : board))
})

export const addInstanceAtom = atom(null, (_get, set, instance: SourceInstance) => {
  set(instancesAtom, prev => [...prev, instance])
})

export const setSourceInstancePatchAtom = atom(null, (_get, set, { instanceId, patch }: { instanceId: string, patch: SourceInstancePatch }) => {
  set(instancesAtom, prev => prev.map((instance) => {
    if (instance.instanceId !== instanceId) {
      return instance
    }

    return {
      ...instance,
      patch: mergeSourceInstancePatch(instance.patch, patch),
    }
  }))
})

export const deleteInstanceAtom = atom(null, (_get, set, instanceId: string) => {
  set(instancesAtom, (prev) => {
    const next = prev.filter(instance => instance.instanceId !== instanceId)
    return next.length === prev.length ? prev : next
  })
  set(boardsAtom, (boards) => {
    let didChange = false
    const next = boards.map((board) => {
      const manualOrder = board.sort.manualOrder.filter(id => id !== instanceId)
      if (manualOrder.length === board.sort.manualOrder.length) {
        return board
      }
      didChange = true
      return { ...board, sort: { ...board.sort, manualOrder } }
    })
    return didChange ? next : boards
  })
})

export const createBoardAtom = atom(null, (_get, set, board: Board) => {
  set(boardsAtom, prev => [...prev, board])
})

export const updateBoardAtom = atom(null, (_get, set, board: Board) => {
  if (board.id === ALL_BOARD_ID) {
    set(allBoardColorAtom, getBoardColor(board))
    return
  }

  set(boardsAtom, prev => prev.map(current => current.id === board.id ? board : current))
})

export const deleteBoardAtom = atom(null, (_get, set, boardId: string) => {
  if (boardId === ALL_BOARD_ID) {
    return
  }

  set(boardsAtom, prev => prev.filter(board => board.id !== boardId))
  set(instancesAtom, prev => prev.map(instance => instance.boardId === boardId
    ? { ...instance, boardId: null }
    : instance))
  set(currentBoardIdAtom, current => current === boardId ? ALL_BOARD_ID : current)
  set(defaultBoardIdAtom, current => current === boardId ? ALL_BOARD_ID : current)
})

export const moveInstanceToBoardAtom = atom(null, (_get, set, { instanceId, boardId }: { instanceId: string, boardId: string | null }) => {
  set(instancesAtom, prev => prev.map(instance => instance.instanceId === instanceId
    ? { ...instance, boardId }
    : instance))
  set(boardsAtom, (boards) => {
    let didChange = false
    const next = boards.map((board) => {
      if (board.id === ALL_BOARD_ID || board.id === boardId) {
        return board
      }
      const manualOrder = board.sort.manualOrder.filter(id => id !== instanceId)
      if (manualOrder.length === board.sort.manualOrder.length) {
        return board
      }
      didChange = true
      return { ...board, sort: { ...board.sort, manualOrder } }
    })
    return didChange ? next : boards
  })
})

export const resetInstanceParamsAtom = atom(null, (_get, set, instanceId: string) => {
  set(instancesAtom, (prev) => {
    let didReset = false
    const next = prev.map((instance) => {
      if (instance.instanceId === instanceId && Object.keys(instance.patch.params ?? {}).length > 0) {
        didReset = true
        return {
          ...instance,
          patch: { ...instance.patch, params: {} },
        }
      }

      return instance
    })

    return didReset ? next : prev
  })
})
