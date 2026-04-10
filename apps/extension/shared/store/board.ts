import type { BoardType } from "@newsnext/shared/types"
import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

export type { BoardType }

export const currentBoardAtom = atom<BoardType>("hottest")
export const STARRED_SOURCE_IDS_KEY = "newsnext-starred-source-ids"
export const starredSourceIdsAtom = atomWithStorage<string[]>(STARRED_SOURCE_IDS_KEY, [])
