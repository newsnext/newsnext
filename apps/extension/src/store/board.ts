import type { ApplicationAction, ApplicationData } from "../lib/application"
import type { Board, BoardCreateInput } from "../lib/board"
import type { OpmlImport } from "../lib/opml"
import type { SourceInstancePatch } from "../lib/source"
import { atom } from "jotai"
import { atomWithStorage, selectAtom, splitAtom } from "jotai/utils"
import { createBackgroundClient } from "../lib/background"
import {
  ALL_BOARD_ID,
  createAllBoard,
  DEFAULT_BOARD_SORT_PREFERENCE,
  DEFAULT_BOARD_VIEW_MODE,
  getBoardColor,
} from "../lib/board"
import { projectCollectionBoard } from "../lib/collection"
import { normalizeApplicationData, PERSISTED_DATA_SLICES } from "../lib/settings"
import { createMirroredStorage } from "./persisted-storage"
import { allBoardColorAtom } from "./settings"

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
export const collectionEntriesAtom = selectAtom(applicationDataAtom, data => data.collectionEntries)
export const collectionViewsAtom = selectAtom(applicationDataAtom, data => data.collectionViews)
export const instancesAtom = selectAtom(applicationDataAtom, data => data.instances)

export const boardsAtom = atom(get => [
  createAllBoard(get(allBoardColorAtom)),
  ...get(collectionsAtom).flatMap((collection) => {
    const view = get(collectionViewsAtom).find(candidate => candidate.collectionId === collection.id)
    return view ? [projectCollectionBoard(collection, view, get(collectionEntriesAtom))] : []
  }),
])

export const executeApplicationActionAtom = atom(
  null,
  async (_get, _set, action: ApplicationAction) => (
    await createBackgroundClient().application.execute(action)
  ),
)

export interface InstanceViewLayout {
  collectionIds: string[]
  createdAt: number
  instanceId: string
  sourceId: string
  title?: string
}

function selectInstanceLayouts(data: ApplicationData): InstanceViewLayout[] {
  const collectionIdsByInstance = new Map<string, string[]>()
  for (const entry of data.collectionEntries) {
    const collectionIds = collectionIdsByInstance.get(entry.instanceId) ?? []
    collectionIds.push(entry.collectionId)
    collectionIdsByInstance.set(entry.instanceId, collectionIds)
  }
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

export const setManualBoardOrderAtom = atom(null, async (_get, set, input: {
  boardId: string
  instanceIds: string[]
}) => {
  if (input.boardId !== ALL_BOARD_ID) {
    await set(executeApplicationActionAtom, {
      type: "collection.reorderInstances",
      input: { collectionId: input.boardId, instanceIds: input.instanceIds },
    })
  }
})

export const addInstanceAtom = atom(null, (_get, set, input: {
  collectionId: string | null
  patch: SourceInstancePatch
  sourceId: string
}) => set(executeApplicationActionAtom, {
  type: "instance.create",
  input,
}))

export const setSourceInstancePatchAtom = atom(null, (_get, set, input: {
  instanceId: string
  patch: SourceInstancePatch
}) => set(executeApplicationActionAtom, {
  type: "instance.configure",
  input,
}))

export const deleteInstanceAtom = atom(null, (_get, set, instanceId: string) => (
  set(executeApplicationActionAtom, {
    type: "instance.delete",
    input: { instanceId },
  })
))

export const createBoardAtom = atom(null, (_get, set, input: BoardCreateInput) => (
  set(executeApplicationActionAtom, {
    type: "collection.create",
    input: {
      name: input.name,
      view: {
        color: input.color,
        defaultView: input.defaultView,
        sortMode: input.sortMode,
      },
    },
  })
))

export const createBoardFromOpmlAtom = atom(null, (_get, set, input: OpmlImport) => (
  set(executeApplicationActionAtom, {
    type: "collection.create",
    input: {
      instances: input.feeds.map(feed => ({
        sourceId: "rss:feed",
        patch: {
          params: { url: feed.url },
          ...(feed.title ? { metadata: { title: feed.title } } : {}),
        },
      })),
      name: input.title,
      view: {
        color: "orange",
        defaultView: DEFAULT_BOARD_VIEW_MODE,
        sortMode: DEFAULT_BOARD_SORT_PREFERENCE.mode,
      },
    },
  })
))

export const updateBoardAtom = atom(null, async (_get, set, board: Board) => {
  if (board.id === ALL_BOARD_ID) {
    set(allBoardColorAtom, getBoardColor(board))
    return
  }
  await set(executeApplicationActionAtom, {
    type: "collection.update",
    input: {
      collectionId: board.id,
      name: board.name,
      view: {
        color: getBoardColor(board),
        defaultView: board.defaultView,
        sortMode: board.sort.mode,
      },
    },
  })
})

export const deleteBoardAtom = atom(null, (_get, set, input: {
  boardId: string
  deleteCards: boolean
}) => {
  if (input.boardId === ALL_BOARD_ID) return
  return set(executeApplicationActionAtom, {
    type: "collection.delete",
    input: {
      collectionId: input.boardId,
      ...(input.deleteCards ? { deleteInstances: true } : {}),
    },
  })
})

export const setInstanceCollectionMembershipAtom = atom(null, (_get, set, input: {
  collectionId: string
  instanceId: string
  member: boolean
}) => set(executeApplicationActionAtom, {
  type: input.member ? "collection.addInstance" : "collection.removeInstance",
  input: { collectionId: input.collectionId, instanceId: input.instanceId },
}))

export const resetInstanceParamsAtom = atom(null, (get, set, instanceId: string) => {
  const instance = get(instancesAtom).find(candidate => candidate.instanceId === instanceId)
  if (!instance || Object.keys(instance.patch.params ?? {}).length === 0) return
  return set(executeApplicationActionAtom, {
    type: "instance.resetParams",
    input: { instanceId },
  })
})
