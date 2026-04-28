import type { ReactNode } from "react"
import type { BoardFeed } from "@/typings/feed"
import { useAtom } from "jotai"
import { useInView } from "motion/react"
import { useCallback, useMemo, useRef, useState } from "react"
import { FlipAnimate } from "@/components/common/flip-animate"
import { useFeedParams } from "@/hooks"
import { useFeedQuery } from "@/hooks/use-feed-query"
import { createFeedInstance } from "@/lib/feed-cards"
import { deleteStoredFeedParamValues, writeStoredFeedParamValues } from "@/lib/feed-params"
import { trpc } from "@/lib/trpc"
import { cn } from "@/lib/utils"
import { feedInstancesAtom, starredFeedInstanceIdsAtom } from "@/store/board"
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
  const [starredFeedInstanceIds, setStarredFeedInstanceIds] = useAtom(starredFeedInstanceIdsAtom)
  const [, setFeedInstances] = useAtom(feedInstancesAtom)
  const upsertFeedInstance = trpc.upsertFeedInstance.useMutation({ onError: () => {} })
  const deleteFeedInstance = trpc.deleteFeedInstance.useMutation({ onError: () => {} })
  const setStarredFeedInstance = trpc.setStarredFeedInstance.useMutation({ onError: () => {} })
  const resetFeedInstanceParams = trpc.resetFeedInstanceParams.useMutation({ onError: () => {} })
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
    initialValues: feed.paramsValue,
  })

  const { items, refetch, isFetching, updatedTime } = useFeedQuery({
    feedId: feed.feedId,
    params: savedParams,
  })

  // useEffect(() => {
  //   if (source.interval <= 2 * 60 * 1000) normalRefetch()
  // }, [date, normalRefetch])

  const isStarred = useMemo(() => starredFeedInstanceIds.includes(id), [id, starredFeedInstanceIds])
  const handleFork = useCallback(() => {
    const forkedInstance = createFeedInstance(feed.feedId, savedParams, true)

    writeStoredFeedParamValues(forkedInstance.instanceId, savedParams)
    upsertFeedInstance.mutate(forkedInstance)
    setFeedInstances(prev =>
      prev.some(item => item.instanceId === forkedInstance.instanceId)
        ? prev
        : [...prev, forkedInstance],
    )

    if (isStarred) {
      setStarredFeedInstanceIds(prev => prev.includes(forkedInstance.instanceId) ? prev : [...prev, forkedInstance.instanceId])
      setStarredFeedInstance.mutate({ instanceId: forkedInstance.instanceId, starred: true })
    }
  }, [feed.feedId, isStarred, savedParams, setFeedInstances, setStarredFeedInstance, setStarredFeedInstanceIds, upsertFeedInstance])

  const handleDelete = useCallback(() => {
    if (!feed.isFork) {
      return
    }

    setFeedInstances(prev => prev.filter(instance => instance.instanceId !== id))
    setStarredFeedInstanceIds(prev => prev.filter(instanceId => instanceId !== id))
    deleteStoredFeedParamValues(id)
    deleteFeedInstance.mutate({ instanceId: id })
  }, [deleteFeedInstance, feed.isFork, id, setFeedInstances, setStarredFeedInstanceIds])

  const handleSaveFeedParams = useCallback(() => {
    const nextParams = saveDraftParams()
    const nextInstance = {
      instanceId: id,
      feedKey: feed.feedId,
      params: nextParams,
      isFork: feed.isFork,
      createdAt: Date.now(),
    }

    setFeedInstances(prev =>
      prev.some(instance => instance.instanceId === id)
        ? prev.map(instance => instance.instanceId === id ? { ...instance, params: nextParams } : instance)
        : [...prev, nextInstance],
    )
    upsertFeedInstance.mutate(nextInstance)
  }, [feed.feedId, feed.isFork, id, saveDraftParams, setFeedInstances, upsertFeedInstance])

  const handleResetFeedParams = useCallback(() => {
    resetDraftParams()
    resetFeedInstanceParams.mutate({ instanceId: id })

    if (feed.isFork) {
      setFeedInstances(prev => prev.map(instance =>
        instance.instanceId === id
          ? { ...instance, params: {} }
          : instance,
      ))
    } else {
      setFeedInstances(prev => prev.filter(instance => instance.instanceId !== id))
    }
  }, [feed.isFork, id, resetDraftParams, resetFeedInstanceParams, setFeedInstances])

  const handleToggleStar = useCallback(() => {
    const nextIsStarred = !isStarred
    setStarredFeedInstanceIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter(instanceId => instanceId !== id)
      }
      return [...prev, id]
    })
    setStarredFeedInstance.mutate({ instanceId: id, starred: nextIsStarred })
  }, [id, isStarred, setStarredFeedInstance, setStarredFeedInstanceIds])

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
      isFork: feed.isFork,
      onRefresh: refetch,
      onToggleStar: handleToggleStar,
      onFork: handleFork,
      onDelete: handleDelete,
      onFeedParamChange: updateDraftParam,
      onSaveFeedParams: handleSaveFeedParams,
      onResetFeedParams: handleResetFeedParams,
      onDiscardFeedParams: discardDraftParams,
      onFlip: () => setIsFlipped(prev => !prev),
      dragHandle,
      updatedTime,
    }),
    [id, feed, savedParams, draftParams, hasParams, isDirty, items, isFetching, isStarred, refetch, handleToggleStar, handleFork, handleDelete, updateDraftParam, handleSaveFeedParams, handleResetFeedParams, discardDraftParams, dragHandle, updatedTime],
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
