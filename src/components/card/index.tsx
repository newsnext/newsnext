import type { ReactNode } from "react"
import { useCallback, useMemo, useState } from "react"
import { FlipAnimate } from "@/components/common/flip-animate"
import { cn } from "@/lib/utils"
import { CardBack } from "./card-back"
import { CardProvider } from "./card-context"
import { CardFront } from "./card-front"
import { MOCK_ITEMS_HOT, MOCK_ITEMS_TIMELINE, MOCK_SOURCES } from "./mock-data"

export interface CardProps {
  id: string
  className?: string
  nodeRef?: (node: HTMLElement | null) => void
  dragHandle?: ReactNode
}

export default function Card({ id, className, nodeRef, dragHandle }: CardProps) {
  const source = MOCK_SOURCES[id] || MOCK_SOURCES["36kr"]
  const [isStarred, setIsStarred] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)

  const items = useMemo(
    () => source.type === "hottest" ? MOCK_ITEMS_HOT : MOCK_ITEMS_TIMELINE,
    [source.type],
  )

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 1000)
  }, [])

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    // Check if the clicked element is an interactive element (button, link, etc.)
    const target = e.target as HTMLElement
    const isInteractive = target.closest("button, a, [role='button']")

    if (!isInteractive) {
      setIsFlipped(prev => !prev)
    }
  }, [])

  const handleToggleStar = useCallback(() => {
    setIsStarred(prev => !prev)
  }, [])

  const contextValue = useMemo(
    () => ({
      id,
      source,
      items,
      isRefreshing,
      isStarred,
      onRefresh: handleRefresh,
      onToggleStar: handleToggleStar,
      onCardClick: handleCardClick,
      dragHandle,
    }),
    [id, source, items, isRefreshing, isStarred, handleRefresh, handleToggleStar, handleCardClick, dragHandle],
  )

  return (
    <CardProvider value={contextValue}>
      <div
        ref={nodeRef}
        className={cn(
          "h-[500px] w-[400px]",
          className,
        )}
      >
        <FlipAnimate
          rotate="y"
          flipped={isFlipped}
        >
          <CardFront />
          <CardBack />
        </FlipAnimate>
      </div>
    </CardProvider>
  )
}
