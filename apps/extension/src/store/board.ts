import type { Board } from "../lib/boards"
import type { SourceInstance, SourceInstancePatch } from "../lib/source-cards"
import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import { DEFAULT_BOARD_ID } from "../lib/boards"

const BOARDS_KEY = "newsnext-boards"
const CURRENT_BOARD_ID_KEY = "newsnext-current-board-id"
const DEFAULT_BOARD_ID_KEY = "newsnext-default-board-id"
const SOURCE_INSTANCES_KEY = "newsnext-source-instances"
export const boardsAtom = atomWithStorage<Board[]>(
  BOARDS_KEY,
  [{ id: DEFAULT_BOARD_ID, name: "Inbox" }],
  undefined,
  { getOnInit: true },
)
export const currentBoardIdAtom = atomWithStorage(
  CURRENT_BOARD_ID_KEY,
  DEFAULT_BOARD_ID,
  undefined,
  { getOnInit: true },
)
export const defaultBoardIdAtom = atomWithStorage<string | null>(
  DEFAULT_BOARD_ID_KEY,
  DEFAULT_BOARD_ID,
  undefined,
  { getOnInit: true },
)
export const instancesAtom = atomWithStorage<SourceInstance[]>(
  SOURCE_INSTANCES_KEY,
  [],
  undefined,
  { getOnInit: true },
)

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
      patch: {
        ...instance.patch,
        ...patch,
      },
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
