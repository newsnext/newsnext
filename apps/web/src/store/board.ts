import type { BoardType } from "@newsnext/shared/types"
import type { Atom } from "jotai"
import type { SourceInstance } from "@/lib/source-cards"
import { atom } from "jotai"
import { atomWithStorage, selectAtom } from "jotai/utils"

export type { BoardType }

export const currentBoardAtom = atom<BoardType>("featured")
export const STARRED_SOURCE_INSTANCE_IDS_KEY = "newsnext-starred-source-instance-ids"
export const SOURCE_INSTANCES_KEY = "newsnext-source-instances"
export const starredSourceInstanceIdsAtom = atomWithStorage<string[]>(STARRED_SOURCE_INSTANCE_IDS_KEY, [])
export const sourceInstancesAtom = atomWithStorage<SourceInstance[]>(SOURCE_INSTANCES_KEY, [])

const EMPTY_SOURCE_INSTANCE_IDS: string[] = []

function areStringArraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

function areSourceInstanceArraysEqual(a: SourceInstance[], b: SourceInstance[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

export function selectIsSourceInstanceStarredAtom(instanceId: string): Atom<boolean> {
  return selectAtom(
    starredSourceInstanceIdsAtom,
    starredSourceInstanceIds => starredSourceInstanceIds.includes(instanceId),
  )
}

function createBoardStarredSourceInstanceIdsAtom(boardId: BoardType): Atom<string[]> {
  return selectAtom(
    starredSourceInstanceIdsAtom,
    starredSourceInstanceIds => boardId === "stars"
      ? starredSourceInstanceIds
      : EMPTY_SOURCE_INSTANCE_IDS,
    areStringArraysEqual,
  )
}

function createBoardSourceInstancesAtom(boardId: BoardType): Atom<SourceInstance[]> {
  return selectAtom(
    sourceInstancesAtom,
    (sourceInstances) => {
      if (boardId === "featured") {
        return sourceInstances.filter(instance => !instance.isFork)
      }

      if (boardId === "forks") {
        return sourceInstances.filter(instance => instance.isFork)
      }

      return sourceInstances
    },
    areSourceInstanceArraysEqual,
  )
}

const boardStarredSourceInstanceIdsAtoms: Record<BoardType, Atom<string[]>> = {
  featured: createBoardStarredSourceInstanceIdsAtom("featured"),
  forks: createBoardStarredSourceInstanceIdsAtom("forks"),
  stars: createBoardStarredSourceInstanceIdsAtom("stars"),
}

const boardSourceInstancesAtoms: Record<BoardType, Atom<SourceInstance[]>> = {
  featured: createBoardSourceInstancesAtom("featured"),
  forks: createBoardSourceInstancesAtom("forks"),
  stars: createBoardSourceInstancesAtom("stars"),
}

export function selectBoardStarredSourceInstanceIdsAtom(boardId: BoardType): Atom<string[]> {
  return boardStarredSourceInstanceIdsAtoms[boardId]
}

export function selectBoardSourceInstancesAtom(boardId: BoardType): Atom<SourceInstance[]> {
  return boardSourceInstancesAtoms[boardId]
}
