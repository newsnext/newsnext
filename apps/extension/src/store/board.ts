import type { BoardSortMode, BoardSortPreference } from "../lib/board-sorting"
import type { Board } from "../lib/boards"
import type { SourceInstance, SourceInstancePatch } from "../lib/source-cards"
import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import { getBoardSortPreference } from "../lib/board-sorting"
import { ALL_BOARD_ID, ALL_BOARD_NAME } from "../lib/boards"
import { mergeSourceInstancePatch } from "../lib/source-cards"

const BOARDS_KEY = "newsnext-boards"
const CURRENT_BOARD_ID_KEY = "newsnext-current-board-id"
const DEFAULT_BOARD_ID_KEY = "newsnext-default-board-id"
const SOURCE_INSTANCES_KEY = "newsnext-source-instances"
const BOARD_SORT_PREFERENCES_KEY = "newsnext-board-sort-preferences"
export const boardsAtom = atomWithStorage<Board[]>(
  BOARDS_KEY,
  [{ id: ALL_BOARD_ID, name: ALL_BOARD_NAME }],
  undefined,
  { getOnInit: true },
)
export const currentBoardIdAtom = atomWithStorage(
  CURRENT_BOARD_ID_KEY,
  ALL_BOARD_ID,
  undefined,
  { getOnInit: true },
)
export const defaultBoardIdAtom = atomWithStorage<string | null>(
  DEFAULT_BOARD_ID_KEY,
  ALL_BOARD_ID,
  undefined,
  { getOnInit: true },
)
export const instancesAtom = atomWithStorage<SourceInstance[]>(
  SOURCE_INSTANCES_KEY,
  [],
  undefined,
  { getOnInit: true },
)
export const boardSortPreferencesAtom = atomWithStorage<Record<string, BoardSortPreference>>(
  BOARD_SORT_PREFERENCES_KEY,
  {},
  undefined,
  { getOnInit: true },
)

export const setBoardSortModeAtom = atom(null, (_get, set, {
  boardId,
  mode,
}: {
  boardId: string
  mode: BoardSortMode
}) => {
  set(boardSortPreferencesAtom, (preferences) => {
    const current = getBoardSortPreference(preferences, boardId)
    return {
      ...preferences,
      [boardId]: {
        ...current,
        mode,
        automaticMode: mode === "manual" ? current.automaticMode : mode,
      },
    }
  })
})

export const setManualBoardOrderAtom = atom(null, (_get, set, {
  boardId,
  sourceIds,
}: {
  boardId: string
  sourceIds: string[]
}) => {
  set(boardSortPreferencesAtom, preferences => ({
    ...preferences,
    [boardId]: {
      ...getBoardSortPreference(preferences, boardId),
      mode: "manual",
      manualOrder: sourceIds,
    },
  }))
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
})

export const createBoardAtom = atom(null, (_get, set, board: Board) => {
  set(boardsAtom, prev => [...prev, board])
})

export const updateBoardAtom = atom(null, (_get, set, board: Board) => {
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
  set(boardSortPreferencesAtom, (preferences) => {
    const remainingPreferences = { ...preferences }
    delete remainingPreferences[boardId]
    return remainingPreferences
  })
  set(currentBoardIdAtom, current => current === boardId ? ALL_BOARD_ID : current)
  set(defaultBoardIdAtom, current => current === boardId ? ALL_BOARD_ID : current)
})

export const moveInstanceToBoardAtom = atom(null, (_get, set, { instanceId, boardId }: { instanceId: string, boardId: string | null }) => {
  set(instancesAtom, prev => prev.map(instance => instance.instanceId === instanceId
    ? { ...instance, boardId }
    : instance))
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
