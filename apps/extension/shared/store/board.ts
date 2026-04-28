import type { BoardType } from "@newsnext/shared/types"
import type { FeedInstance } from "@/lib/feed-cards"
import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

export type { BoardType }

export const currentBoardAtom = atom<BoardType>("featured")
export const STARRED_FEED_INSTANCE_IDS_KEY = "newsnext-starred-feed-instance-ids"
export const FEED_INSTANCES_KEY = "newsnext-feed-instances"
export const starredFeedInstanceIdsAtom = atomWithStorage<string[]>(STARRED_FEED_INSTANCE_IDS_KEY, [])
export const feedInstancesAtom = atomWithStorage<FeedInstance[]>(FEED_INSTANCES_KEY, [])
