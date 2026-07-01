import { createContext, use } from "react"

export interface CardPreviewContextValue {
  canShowHoverPreview: boolean
}

export const CardPreviewContext = createContext<CardPreviewContextValue | null>(null)

export function useCardPreview(): CardPreviewContextValue {
  const context = use(CardPreviewContext)

  if (!context) {
    return {
      canShowHoverPreview: false,
    }
  }

  return context
}
