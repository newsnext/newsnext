import type { BoardType } from "@newsnext/shared/types"
import type { SourceInstance } from "@/lib/source-cards"
import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

export type { BoardType }

export const currentBoardAtom = atom<BoardType>("featured")
export const STARRED_SOURCE_INSTANCE_IDS_KEY = "newsnext-starred-source-instance-ids"
export const SOURCE_INSTANCES_KEY = "newsnext-source-instances"
export const starredSourceInstanceIdsAtom = atomWithStorage<string[]>(STARRED_SOURCE_INSTANCE_IDS_KEY, [])
export const sourceInstancesAtom = atomWithStorage<SourceInstance[]>(SOURCE_INSTANCES_KEY, [])
