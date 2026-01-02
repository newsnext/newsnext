import type { ReactNode } from "react"
import type { Source } from "@/typings/source"
import { useInView } from "motion/react"
import { useMemo, useRef, useState } from "react"
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

function CardContent({ id, source, dragHandle }: CardProps) {
  const [isStarred, setIsStarred] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)

  const { items, refetch, isFetching, updatedTime } = useSourceQuery({
    sourceId: id,
  })

  // useEffect(() => {
  //   if (source.interval <= 2 * 60 * 1000) normalRefetch()
  // }, [date, normalRefetch])

  const contextValue = useMemo(
    () => ({
      id,
      source,
      items,
      isFetching,
      isStarred,
      onRefresh: refetch,
      onToggleStar: () => setIsStarred(prev => !prev),
      onFlip: () => setIsFlipped(prev => !prev),
      dragHandle,
      updatedTime,
    }),
    [id, source, items, isFetching, isStarred, refetch, dragHandle, updatedTime],
  )

  return (
    <CardContext.Provider value={contextValue}>
      <FlipAnimate
        rotate="y"
        flipped={isFlipped}
      >
        <CardFront />
        <CardBack />
      </FlipAnimate>
    </CardContext.Provider>
  )
}

export default function Card(props: CardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const setRef = (node: HTMLDivElement | null) => {
    ref.current = node
    props.nodeRef?.(node)
  }

  const inView = useInView(ref, {
    once: true,
  })

  return (
    <div
      ref={setRef}
      className={cn(
        "h-125 w-100",
        props.className,
      )}
    >
      {inView && (
        <CardContent {...props} />
      )}
    </div>
  )
}
