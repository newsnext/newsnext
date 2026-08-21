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
  getBoardColor,
} from "../lib/board"
import { indexCollectionIdsByInstance } from "../lib/collection"
import { normalizeApplicationData, PERSISTED_DATA_SLICES } from "../lib/settings"
import { createMirroredStorage } from "./persisted-storage"

const persistedApplicationDataAtom = atomWithStorage<ApplicationData>(
  PERSISTED_DATA_SLICES.application.key,
  normalizeApplicationData(undefined),
  createMirroredStorage({
    defaultValue: () => normalizeApplicationData(undefined),
    key: PERSISTED_DATA_SLICES.application.key,
    normalize: normalizeApplicationData,
    readOnly: true,
  }),
  { getOnInit: true },
)
export const applicationDataAtom = atom(get => get(persistedApplicationDataAtom))

export const collectionsAtom = selectAtom(applicationDataAtom, data => data.collections)
export const instancesAtom = selectAtom(applicationDataAtom, data => data.instances)

export const boardsAtom = collectionsAtom

export interface InstanceViewLayout {
  collectionIds: string[]
  createdAt: number
  instanceId: string
  sourceId: string
  title?: string
}

function selectInstanceLayouts(data: ApplicationData): InstanceViewLayout[] {
  const collectionIdsByInstance = indexCollectionIdsByInstance(data.collections)
  return data.instances.map(instance => ({
    collectionIds: collectionIdsByInstance.get(instance.instanceId) ?? [],
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
      && layout.collectionIds.length === candidate.collectionIds.length
      && layout.collectionIds.every((collectionId, collectionIndex) => (
        collectionId === candidate.collectionIds[collectionIndex]
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
    collectionId: input.boardId,
    instanceIds: input.instanceIds,
  })
})

export const addInstanceAtom = atom(null, (_get, _set, input: {
  collectionIds: string[]
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
  actions.collection.create({
    name: input.name,
    board: {
      color: input.color,
      defaultLayer: input.defaultLayer,
      sortMode: input.sortMode,
    },
  })
))

export const createBoardFromOpmlAtom = atom(null, (_get, _set, input: OpmlImport) => (
  actions.collection.create({
    instances: input.feeds.map(feed => ({
      sourceId: "rss:feed",
      patch: {
        params: { url: feed.url },
        ...(feed.title ? { metadata: { title: feed.title } } : {}),
      },
    })),
    name: input.title,
    board: {
      color: "orange",
      defaultLayer: DEFAULT_BOARD_LAYER,
      sortMode: DEFAULT_NOW_LAYER_SORT.mode,
    },
  })
))

export const updateBoardAtom = atom(null, async (_get, _set, board: Board) => {
  await actions.collection.update({
    collectionId: board.id,
    name: board.name,
    board: {
      color: getBoardColor(board),
      defaultLayer: board.defaultLayer,
      sortMode: board.nowLayer.sort.mode,
    },
  })
})

type DeleteBoardInput
  = | { boardId: string, mode: "delete" }
    | { boardId: string, mode: "transfer", targetBoardId: string }

export const deleteBoardAtom = atom(null, (_get, _set, input: DeleteBoardInput) => (
  input.mode === "delete"
    ? actions.collection.delete({ collectionId: input.boardId, deleteInstances: true })
    : actions.collection.delete({ collectionId: input.boardId, targetCollectionId: input.targetBoardId })
))

export const setInstanceCollectionMembershipAtom = atom(null, (_get, _set, input: {
  collectionId: string
  instanceId: string
  member: boolean
}) => input.member
  ? actions.collection.addInstance({ collectionId: input.collectionId, instanceId: input.instanceId })
  : actions.collection.removeInstance({ collectionId: input.collectionId, instanceId: input.instanceId }))

export const resetInstanceParamsAtom = atom(null, (get, _set, instanceId: string) => {
  const instance = get(instancesAtom).find(candidate => candidate.instanceId === instanceId)
  if (!instance || Object.keys(instance.patch.params ?? {}).length === 0) return
  return actions.instance.resetParams({ instanceId })
})
