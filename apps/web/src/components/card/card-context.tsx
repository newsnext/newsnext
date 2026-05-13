import type { ReactNode } from "react"
import type { BoardSource, NewsItem } from "@/typings/source"

import { createContext, useContext } from "react"

interface CardContextValue {
  id: string
  source: BoardSource
  sourceParams: Record<string, unknown>
  draftSourceParams: Record<string, unknown>
  hasSourceParams: boolean
  hasSourceParamChanges: boolean
  items: NewsItem[]
  isFetching: boolean
  isStarred: boolean
  isFork: boolean
  onRefresh: () => void
  onToggleStar: () => void
  onFork: () => void
  onDelete: () => void
  onSourceParamChange: (key: string, value: unknown) => void
  onSaveSourceParams: () => void
  onResetSourceParams: () => void
  onDiscardSourceParams: () => void
  onFlip: () => void
  onOpenExpandedPreview: (item: NewsItem) => void
  canOpenExpandedPreview: boolean
  canShowHoverPreview: boolean
  previewSelection?: {
    selectedItemUrl?: string
    onSelectItem: (item: NewsItem) => void
  }
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
