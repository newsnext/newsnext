import type { NewsItem } from "@/typings/source"
import { createContext, use } from "react"

export interface CardPreviewContextValue {
  onOpenExpandedPreview: (item: NewsItem) => void
  canOpenExpandedPreview: boolean
  canShowHoverPreview: boolean
}

export const CardPreviewContext = createContext<CardPreviewContextValue | null>(null)

export function useCardPreview(): CardPreviewContextValue {
  const context = use(CardPreviewContext)

  if (!context) {
    return {
      onOpenExpandedPreview: () => {},
      canOpenExpandedPreview: false,
      canShowHoverPreview: false,
    }
  }

  return context
}
