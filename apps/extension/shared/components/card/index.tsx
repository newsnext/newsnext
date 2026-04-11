import type { ReactNode } from "react"
import type { BoardFeed } from "@/typings/feed"
import { useAtom } from "jotai"
import { useInView } from "motion/react"
import { useCallback, useMemo, useRef, useState } from "react"
import { FlipAnimate } from "@/components/common/flip-animate"
import { useFeedParams } from "@/hooks"
import { useFeedQuery } from "@/hooks/use-feed-query"
import { createForkedFeedCard } from "@/lib/feed-cards"
import { deleteStoredFeedParamValues, writeStoredFeedParamValues } from "@/lib/feed-params"
import { cn } from "@/lib/utils"
import { forkedFeedCardsAtom, starredFeedIdsAtom } from "@/store/board"
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
  const [, setForkedFeedCards] = useAtom(forkedFeedCardsAtom)
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
    storageId: id,
    params: feed.params,
  })

  const { items, refetch, isFetching, updatedTime } = useFeedQuery({
    feedId: feed.feedId,
    params: savedParams,
  })

  // useEffect(() => {
  //   if (source.interval <= 2 * 60 * 1000) normalRefetch()
  // }, [date, normalRefetch])

  const isStarred = useMemo(() => starredFeedIds.includes(id), [id, starredFeedIds])
  const handleCopy = useCallback(() => {
    const forkedFeedCard = createForkedFeedCard(feed.feedId)

    writeStoredFeedParamValues(forkedFeedCard.id, savedParams)
    setForkedFeedCards(prev => [...prev, forkedFeedCard])

    if (isStarred) {
      setStarredFeedIds(prev => prev.includes(forkedFeedCard.id) ? prev : [...prev, forkedFeedCard.id])
    }
  }, [feed.feedId, isStarred, savedParams, setForkedFeedCards, setStarredFeedIds])

  const handleDelete = useCallback(() => {
    if (!feed.isCopy) {
      return
    }

    setForkedFeedCards(prev => prev.filter(forkedFeedCard => forkedFeedCard.id !== id))
    setStarredFeedIds(prev => prev.filter(starredFeedId => starredFeedId !== id))
    deleteStoredFeedParamValues(id)
  }, [feed.isCopy, id, setForkedFeedCards, setStarredFeedIds])

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
      isCopy: feed.isCopy,
      onRefresh: refetch,
      onToggleStar: () =>
        setStarredFeedIds((prev) => {
          if (prev.includes(id)) {
            return prev.filter(feedId => feedId !== id)
          }
          return [...prev, id]
        }),
      onCopy: handleCopy,
      onDelete: handleDelete,
      onFeedParamChange: updateDraftParam,
      onSaveFeedParams: saveDraftParams,
      onResetFeedParams: resetDraftParams,
      onDiscardFeedParams: discardDraftParams,
      onFlip: () => setIsFlipped(prev => !prev),
      dragHandle,
      updatedTime,
    }),
    [id, feed, savedParams, draftParams, hasParams, isDirty, items, isFetching, isStarred, refetch, setStarredFeedIds, handleCopy, handleDelete, updateDraftParam, saveDraftParams, resetDraftParams, discardDraftParams, dragHandle, updatedTime],
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
