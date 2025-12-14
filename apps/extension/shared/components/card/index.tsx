import type { ReactNode } from "react"
import type { Source } from "@/typings/source"
import { useInView } from "motion/react"
import { useCallback, useImperativeHandle, useMemo, useRef, useState } from "react"
import { FlipAnimate } from "@/components/common/flip-animate"
import { useSourceQuery } from "@/hooks/use-source-query"
import { cn } from "@/lib/utils"
import { CardBack } from "./card-back"
import { CardContext } from "./card-context"
import { CardFront } from "./card-front"

export interface CardProps {
  id: string
  source: Source & { id: string }
  className?: string
  nodeRef?: (node: HTMLElement | null) => void
  dragHandle?: ReactNode
}

export default function Card({ id, source, className, nodeRef, dragHandle }: CardProps) {
  const [isStarred, setIsStarred] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const inView = useInView(ref, {
    once: true,
  })

  useImperativeHandle(nodeRef, () => ref.current! as HTMLDivElement)

  const { items, refetch, isFetching } = useSourceQuery({
    sourceId: id,
    enabled: inView,
  })

  const handleRefresh = useCallback(() => {
    refetch()
  }, [refetch])

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
      isRefreshing: isFetching,
      isStarred,
      onRefresh: handleRefresh,
      onToggleStar: handleToggleStar,
      onCardClick: handleCardClick,
      dragHandle,
    }),
    [id, source, items, isFetching, isStarred, handleRefresh, handleToggleStar, handleCardClick, dragHandle],
  )

  return (
    <CardContext.Provider value={contextValue}>
      <div
        ref={ref}
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
    </CardContext.Provider>
  )
}
