import type { BoardSource, NewsItem } from "@/typings/source"
import { createContext, use } from "react"

export interface ExpandedPreviewContextValue {
  openExpandedPreview: (cardId: string, source: BoardSource, item: NewsItem) => void
  isExpandedPreviewOpen: boolean
}

export const ExpandedPreviewContext = createContext<ExpandedPreviewContextValue | null>(null)

export function useExpandedPreview() {
  const context = use(ExpandedPreviewContext)
  if (!context) {
    throw new Error("useExpandedPreview must be used within ExpandedPreviewProvider")
  }
  return context
}
