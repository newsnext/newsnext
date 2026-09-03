import type { ApplicationData } from "../lib/application"
import type { Board, BoardCreateInput } from "../lib/board"
import type { OpmlImport } from "../lib/opml"
import type { InstancePatch } from "../lib/source"
import { atom } from "jotai"
import { atomWithStorage, selectAtom, splitAtom } from "jotai/utils"
import { actions } from "../lib/actions"
import {
  DEFAULT_BOARD_LAYER,
  DEFAULT_NOW_LAYER_SORT,
  indexBoardIdsByInstance,
} from "../lib/board"
import { normalizeApplicationData, PERSISTED_DATA_SLICES } from "../lib/settings"
import { createExtensionStorage } from "./persisted-storage"
import { currentBoardIdAtom } from "./settings"

const applicationDataStorage = createExtensionStorage({
  defaultValue: () => normalizeApplicationData(undefined),
  key: PERSISTED_DATA_SLICES.application.key,
  normalize: normalizeApplicationData,
  readOnly: true,
})

const persistedApplicationDataAtom = atomWithStorage<ApplicationData>(
  PERSISTED_DATA_SLICES.application.key,
  normalizeApplicationData(undefined),
  applicationDataStorage,
  { getOnInit: true },
)
export const applicationDataAtom = atom(get => get(persistedApplicationDataAtom))

export async function initializeApplicationDataStorage(): Promise<void> {
  await applicationDataStorage.initialize()
}

export const boardsAtom = selectAtom(applicationDataAtom, data => data.boards)
export const currentBoardAtom = atom((get) => {
  const currentBoardId = get(currentBoardIdAtom)
  return get(boardsAtom).find(board => board.id === currentBoardId)
})
export const instancesAtom = selectAtom(applicationDataAtom, data => data.instances)
export interface InstanceViewLayout {
  boardIds: string[]
  createdAt: number
  instanceId: string
  sourceId: string
  title?: string
}

function selectInstanceLayouts(data: ApplicationData): InstanceViewLayout[] {
  const boardIdsByInstance = indexBoardIdsByInstance(data.boards)
  return data.instances.map(instance => ({
    boardIds: boardIdsByInstance.get(instance.instanceId) ?? [],
    createdAt: instance.createdAt,
    instanceId: instance.instanceId,
    sourceId: instance.sourceId,
    title: instance.patch.metadata?.title,
  }))
}

function areInstanceLayoutsEqual(left: InstanceViewLayout[], right: InstanceViewLayout[]): boolean {
  return left.length === right.length && left.every((layout, index) => {
    const candidate = right[index]
    return candidate !== undefined
      && layout.createdAt === candidate.createdAt
      && layout.instanceId === candidate.instanceId
      && layout.sourceId === candidate.sourceId
      && layout.title === candidate.title
      && layout.boardIds.length === candidate.boardIds.length
      && layout.boardIds.every((boardId, boardIndex) => (
        boardId === candidate.boardIds[boardIndex]
      ))
  })
}

export const instanceAtomsAtom = splitAtom(instancesAtom, instance => instance.instanceId)
export const instanceLayoutsAtom = selectAtom(
  applicationDataAtom,
  selectInstanceLayouts,
  areInstanceLayoutsEqual,
)

export const setNowLayerManualOrderAtom = atom(null, async (_get, _set, input: {
  boardId: string
  instanceIds: string[]
}) => {
  await actions.nowLayer.setManualOrder({
    boardId: input.boardId,
    instanceIds: input.instanceIds,
  })
})

export const addInstanceAtom = atom(null, (_get, _set, input: {
  boardIds: [string]
  patch: InstancePatch
  sourceId: string
}) => actions.instance.create(input))

export const setInstancePatchAtom = atom(null, (_get, _set, input: {
  instanceId: string
  patch: InstancePatch
}) => actions.instance.configure(input))

export const deleteInstanceAtom = atom(null, (_get, _set, instanceId: string) => (
  actions.instance.delete({ instanceId })
))

export const createBoardAtom = atom(null, (_get, _set, input: BoardCreateInput) => (
  actions.board.create({
    color: input.color,
    defaultLayer: input.defaultLayer,
    name: input.name,
    sortMode: input.sortMode,
  })
))

export const createBoardFromOpmlAtom = atom(null, (_get, _set, input: OpmlImport) => (
  actions.board.create({
    instances: input.feeds.map(feed => ({
      sourceId: "rss:feed",
      patch: {
        params: { url: feed.url },
        ...(feed.title ? { metadata: { title: feed.title } } : {}),
      },
    })),
    color: "orange",
    defaultLayer: DEFAULT_BOARD_LAYER,
    name: input.title,
    sortMode: DEFAULT_NOW_LAYER_SORT.mode,
  })
))

export const updateBoardAtom = atom(null, async (_get, _set, board: Board) => {
  await actions.board.update({
    boardId: board.id,
    color: board.color,
    defaultLayer: board.defaultLayer,
    illustration: board.illustration,
    name: board.name,
    sortMode: board.nowLayer.sort.mode,
  })
})

type DeleteBoardInput
  = | { boardId: string, mode: "delete" }
    | { boardId: string, mode: "transfer", targetBoardId: string }

export const deleteBoardAtom = atom(null, (_get, _set, input: DeleteBoardInput) => (
  input.mode === "delete"
    ? actions.board.delete({ boardId: input.boardId, deleteInstances: true })
    : actions.board.delete({ boardId: input.boardId, targetBoardId: input.targetBoardId })
))

export const moveInstanceToBoardAtom = atom(null, (_get, _set, input: {
  instanceId: string
  targetBoardId: string
}) => actions.board.addInstance({
  boardId: input.targetBoardId,
  instanceId: input.instanceId,
}))

export const resetInstanceParamsAtom = atom(null, (get, _set, instanceId: string) => {
  const instance = get(instancesAtom).find(candidate => candidate.instanceId === instanceId)
  if (!instance || Object.keys(instance.patch.params ?? {}).length === 0) return
  return actions.instance.resetParams({ instanceId })
})
