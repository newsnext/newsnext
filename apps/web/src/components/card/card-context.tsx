import type { ReactNode } from "react"
import type { NewsItem, Source } from "@/typings/source"

import { createContext, useContext } from "react"

interface CardContextValue {
  id: string
  source: Source & { id: string }
  items: NewsItem[]
  isRefreshing: boolean
  isStarred: boolean
  onRefresh: () => void
  onToggleStar: () => void
  onCardClick: (e: React.MouseEvent) => void
  dragHandle?: ReactNode
}

const CardContext = createContext<CardContextValue | null>(null)

export function CardProvider({ children, value }: { children: ReactNode, value: CardContextValue }) {
  return (
    <CardContext.Provider value={value}>
      {children}
    </CardContext.Provider>
  )
}

export function useCard() {
  const context = useContext(CardContext)
  if (!context) {
    throw new Error("useCard must be used within CardProvider")
  }
  return context
}
