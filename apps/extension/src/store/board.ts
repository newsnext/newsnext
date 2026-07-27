import type { BoardType } from "@newsnext/shared/types"
import type { Atom } from "jotai"
import type { SourceInstance, SourceInstancePatch } from "../lib/source-cards"
import { atom } from "jotai"
import { atomWithStorage, selectAtom } from "jotai/utils"

export type { BoardType }

export const currentBoardAtom = atom<BoardType>("stars")
export const pendingForkFocusAtom = atom<string | null>(null)
export const STARRED_SOURCE_INSTANCE_IDS_KEY = "newsnext-starred-source-instance-ids"
export const SOURCE_INSTANCES_KEY = "newsnext-source-instances"
export const starIdsAtom = atomWithStorage<string[]>(
  STARRED_SOURCE_INSTANCE_IDS_KEY,
  [],
  undefined,
  { getOnInit: true },
)
export const instancesAtom = atomWithStorage<SourceInstance[]>(
  SOURCE_INSTANCES_KEY,
  [],
  undefined,
  { getOnInit: true },
)

const EMPTY_STARRED_INSTANCE_IDS: string[] = []

function areStringArraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

function areInstancesEqual(a: SourceInstance, b: SourceInstance): boolean {
  return a.instanceId === b.instanceId
    && a.sourceId === b.sourceId
    && a.createdAt === b.createdAt
    && a.updatedAt === b.updatedAt
    && a.patch === b.patch
}

function removeTemporarySourceIds(starredInstanceIds: string[]): string[] {
  return starredInstanceIds.filter(instanceId => !instanceId.startsWith("tmp:"))
}

export const replaceInstancesAtom = atom(null, (_get, set, instances: SourceInstance[]) => {
  set(instancesAtom, instances)
})

export const replaceStarIdsAtom = atom(null, (_get, set, starredInstanceIds: string[]) => {
  set(starIdsAtom, removeTemporarySourceIds(starredInstanceIds))
})

export const cleanTemporaryStarIdsAtom = atom(null, (get, set) => {
  const starredInstanceIds = get(starIdsAtom)
  const nextStarredInstanceIds = removeTemporarySourceIds(starredInstanceIds)
  if (!areStringArraysEqual(starredInstanceIds, nextStarredInstanceIds)) {
    set(starIdsAtom, nextStarredInstanceIds)
  }
})

export const upsertInstanceAtom = atom(null, (_get, set, instance: SourceInstance) => {
  set(instancesAtom, (prev) => {
    const currentIndex = prev.findIndex(currentInstance => currentInstance.instanceId === instance.instanceId)

    if (currentIndex === -1) {
      return [...prev, instance]
    }

    const currentInstance = prev[currentIndex]
    if (areInstancesEqual(currentInstance, instance)) {
      return prev
    }

    return prev.map(currentInstance =>
      currentInstance.instanceId === instance.instanceId
        ? { ...instance, createdAt: currentInstance.createdAt }
        : currentInstance,
    )
  })
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
      updatedAt: Date.now(),
    }
  }))
})

export const deleteInstanceAtom = atom(null, (_get, set, instanceId: string) => {
  set(instancesAtom, (prev) => {
    const next = prev.filter(instance => instance.instanceId !== instanceId)
    return next.length === prev.length ? prev : next
  })
  set(starIdsAtom, (prev) => {
    const next = prev.filter(starredInstanceId => starredInstanceId !== instanceId)
    return next.length === prev.length ? prev : next
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
          updatedAt: Date.now(),
        }
      }

      return instance
    })

    return didReset ? next : prev
  })
})

export const starInstanceAtom = atom(null, (_get, set, { instanceId, starred }: { instanceId: string, starred: boolean }) => {
  if (instanceId.startsWith("tmp:")) {
    return
  }

  set(starIdsAtom, (prev) => {
    const isAlreadyStarred = prev.includes(instanceId)

    if (starred) {
      if (isAlreadyStarred) {
        return prev
      }

      return [...prev, instanceId]
    }

    if (!isAlreadyStarred) {
      return prev
    }

    return prev.filter(starredInstanceId => starredInstanceId !== instanceId)
  })
})

export function instanceStarredAtom(instanceId: string): Atom<boolean> {
  return selectAtom(
    starIdsAtom,
    starredInstanceIds => starredInstanceIds.includes(instanceId),
  )
}

function createBoardStarIdsAtom(boardId: BoardType): Atom<string[]> {
  return selectAtom(
    starIdsAtom,
    starredInstanceIds => boardId === "stars"
      ? starredInstanceIds
      : EMPTY_STARRED_INSTANCE_IDS,
    areStringArraysEqual,
  )
}

const boardStarIdsAtoms: Record<BoardType, Atom<string[]>> = {
  forks: createBoardStarIdsAtom("forks"),
  stars: createBoardStarIdsAtom("stars"),
}

export function boardStarIdsAtom(boardId: BoardType): Atom<string[]> {
  return boardStarIdsAtoms[boardId]
}
