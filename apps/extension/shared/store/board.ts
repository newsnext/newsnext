import type { BoardType } from "@newsnext/shared/types"
import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

export type { BoardType }

export const currentBoardAtom = atom<BoardType>("recommend")
export const STARRED_FEED_IDS_KEY = "newsnext-starred-feed-ids"
export const starredFeedIdsAtom = atomWithStorage<string[]>(STARRED_FEED_IDS_KEY, [])
