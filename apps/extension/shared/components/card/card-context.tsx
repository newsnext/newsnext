import type { ReactNode } from "react"
import type { BoardFeed, NewsItem } from "@/typings/feed"

import { createContext, useContext } from "react"

interface CardContextValue {
  id: string
  feed: BoardFeed
  feedParams: Record<string, unknown>
  draftFeedParams: Record<string, unknown>
  hasFeedParams: boolean
  hasFeedParamChanges: boolean
  items: NewsItem[]
  isFetching: boolean
  isStarred: boolean
  isFork: boolean
  onRefresh: () => void
  onToggleStar: () => void
  onFork: () => void
  onDelete: () => void
  onFeedParamChange: (key: string, value: unknown) => void
  onSaveFeedParams: () => void
  onResetFeedParams: () => void
  onDiscardFeedParams: () => void
  onFlip: () => void
  dragHandle?: ReactNode
  updatedTime: number
}

export const CardContext = createContext<CardContextValue | null>(null)

export function useCard() {
  const context = useContext(CardContext)
  if (!context) {
    throw new Error("useCard must be used within CardProvider")
  }
  return context
}
