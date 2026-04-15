import type { BoardType } from "@newsnext/shared/types"
import type { ForkedFeedCard } from "@/lib/feed-cards"
import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

export type { BoardType }

export const currentBoardAtom = atom<BoardType>("featured")
export const STARRED_CARD_IDS_KEY = "newsnext-starred-feed-ids"
export const FORKED_FEED_CARDS_KEY = "newsnext-forked-feed-cards"
export const starredFeedIdsAtom = atomWithStorage<string[]>(STARRED_CARD_IDS_KEY, [])
export const forkedFeedCardsAtom = atomWithStorage<ForkedFeedCard[]>(FORKED_FEED_CARDS_KEY, [])
