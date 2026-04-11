import type { ReactNode } from "react"
import type { BoardFeed } from "@/typings/feed"
import { useAtom } from "jotai"
import { useInView } from "motion/react"
import { useMemo, useRef, useState } from "react"
import { FlipAnimate } from "@/components/common/flip-animate"
import { useFeedParams } from "@/hooks"
import { useFeedQuery } from "@/hooks/use-feed-query"
import { cn } from "@/lib/utils"
import { starredFeedIdsAtom } from "@/store/board"
import { CardBack } from "./card-back"
import { CardContext } from "./card-context"
import { CardFront } from "./card-front"

export interface CardProps {
  id: string
  feed: BoardFeed
  className?: string
  nodeRef?: (node: HTMLElement | null) => void
  dragHandle?: ReactNode
}

function CardContent({ id, feed, dragHandle }: CardProps) {
  const [starredFeedIds, setStarredFeedIds] = useAtom(starredFeedIdsAtom)
  const [isFlipped, setIsFlipped] = useState(false)
  const {
    hasParams,
    savedParams,
    draftParams,
    isDirty,
    updateDraftParam,
    saveDraftParams,
    resetDraftParams,
    discardDraftParams,
  } = useFeedParams({
    feedId: id,
    params: feed.params,
  })

  const { items, refetch, isFetching, updatedTime } = useFeedQuery({
    feedId: id,
    params: savedParams,
  })

  // useEffect(() => {
  //   if (source.interval <= 2 * 60 * 1000) normalRefetch()
  // }, [date, normalRefetch])

  const isStarred = useMemo(() => starredFeedIds.includes(id), [id, starredFeedIds])

  const contextValue = useMemo(
    () => ({
      id,
      feed,
      feedParams: savedParams,
      draftFeedParams: draftParams,
      hasFeedParams: hasParams,
      hasFeedParamChanges: isDirty,
      items,
      isFetching,
      isStarred,
      onRefresh: refetch,
      onToggleStar: () =>
        setStarredFeedIds((prev) => {
          if (prev.includes(id)) {
            return prev.filter(feedId => feedId !== id)
          }
          return [...prev, id]
        }),
      onFeedParamChange: updateDraftParam,
      onSaveFeedParams: saveDraftParams,
      onResetFeedParams: resetDraftParams,
      onDiscardFeedParams: discardDraftParams,
      onFlip: () => setIsFlipped(prev => !prev),
      dragHandle,
      updatedTime,
    }),
    [id, feed, savedParams, draftParams, hasParams, isDirty, items, isFetching, isStarred, refetch, setStarredFeedIds, updateDraftParam, saveDraftParams, resetDraftParams, discardDraftParams, dragHandle, updatedTime],
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
