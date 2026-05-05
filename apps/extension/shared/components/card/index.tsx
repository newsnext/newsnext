import type { ReactNode } from "react"
import type { BoardSource } from "@/typings/source"
import { useAtom } from "jotai"
import { useInView } from "motion/react"
import { useCallback, useMemo, useRef, useState } from "react"
import { FlipAnimate } from "@/components/common/flip-animate"
import { useSourceParams } from "@/hooks"
import { useSourceQuery } from "@/hooks/use-source-query"
import { createSourceInstance } from "@/lib/source-cards"
import { deleteStoredSourceParamValues, writeStoredSourceParamValues } from "@/lib/source-params"
import { trpc } from "@/lib/trpc"
import { cn } from "@/lib/utils"
import { sourceInstancesAtom, starredSourceInstanceIdsAtom } from "@/store/board"
import { CardBack } from "./card-back"
import { CardContext } from "./card-context"
import { CardFront } from "./card-front"

export interface CardProps {
  id: string
  source: BoardSource
  className?: string
  nodeRef?: (node: HTMLElement | null) => void
  dragHandle?: ReactNode
}

function CardContent({ id, source, dragHandle }: CardProps) {
  const [starredSourceInstanceIds, setStarredSourceInstanceIds] = useAtom(starredSourceInstanceIdsAtom)
  const [, setSourceInstances] = useAtom(sourceInstancesAtom)
  const upsertSourceInstance = trpc.upsertSourceInstance.useMutation({ onError: () => {} })
  const deleteSourceInstance = trpc.deleteSourceInstance.useMutation({ onError: () => {} })
  const setStarredSourceInstance = trpc.setStarredSourceInstance.useMutation({ onError: () => {} })
  const resetSourceInstanceParams = trpc.resetSourceInstanceParams.useMutation({ onError: () => {} })
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
  } = useSourceParams({
    storageId: id,
    params: source.params,
    initialValues: source.paramsValue,
  })

  const { items, refetch, isFetching, updatedTime } = useSourceQuery({
    sourceId: source.sourceId,
    params: savedParams,
  })

  // useEffect(() => {
  //   if (source.maxCacheAge <= 2 * 60 * 1000) normalRefetch()
  // }, [date, normalRefetch])

  const isStarred = useMemo(() => starredSourceInstanceIds.includes(id), [id, starredSourceInstanceIds])
  const handleFork = useCallback(() => {
    const forkedInstance = createSourceInstance(source.sourceId, savedParams, true)

    writeStoredSourceParamValues(forkedInstance.instanceId, savedParams)
    upsertSourceInstance.mutate(forkedInstance)
    setSourceInstances(prev =>
      prev.some(item => item.instanceId === forkedInstance.instanceId)
        ? prev
        : [...prev, forkedInstance],
    )

    if (isStarred) {
      setStarredSourceInstanceIds(prev => prev.includes(forkedInstance.instanceId) ? prev : [...prev, forkedInstance.instanceId])
      setStarredSourceInstance.mutate({ instanceId: forkedInstance.instanceId, starred: true })
    }
  }, [source.sourceId, isStarred, savedParams, setSourceInstances, setStarredSourceInstance, setStarredSourceInstanceIds, upsertSourceInstance])

  const handleDelete = useCallback(() => {
    if (!source.isFork) {
      return
    }

    setSourceInstances(prev => prev.filter(instance => instance.instanceId !== id))
    setStarredSourceInstanceIds(prev => prev.filter(instanceId => instanceId !== id))
    deleteStoredSourceParamValues(id)
    deleteSourceInstance.mutate({ instanceId: id })
  }, [deleteSourceInstance, source.isFork, id, setSourceInstances, setStarredSourceInstanceIds])

  const handleSaveSourceParams = useCallback(() => {
    const nextParams = saveDraftParams()
    const nextInstance = {
      instanceId: id,
      sourceKey: source.sourceId,
      params: nextParams,
      isFork: source.isFork,
      createdAt: Date.now(),
    }

    setSourceInstances(prev =>
      prev.some(instance => instance.instanceId === id)
        ? prev.map(instance => instance.instanceId === id ? { ...instance, params: nextParams } : instance)
        : [...prev, nextInstance],
    )
    upsertSourceInstance.mutate(nextInstance)
  }, [source.sourceId, source.isFork, id, saveDraftParams, setSourceInstances, upsertSourceInstance])

  const handleResetSourceParams = useCallback(() => {
    resetDraftParams()
    resetSourceInstanceParams.mutate({ instanceId: id })

    if (source.isFork) {
      setSourceInstances(prev => prev.map(instance =>
        instance.instanceId === id
          ? { ...instance, params: {} }
          : instance,
      ))
    } else {
      setSourceInstances(prev => prev.filter(instance => instance.instanceId !== id))
    }
  }, [source.isFork, id, resetDraftParams, resetSourceInstanceParams, setSourceInstances])

  const handleToggleStar = useCallback(() => {
    const nextIsStarred = !isStarred
    setStarredSourceInstanceIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter(instanceId => instanceId !== id)
      }
      return [...prev, id]
    })
    setStarredSourceInstance.mutate({ instanceId: id, starred: nextIsStarred })
  }, [id, isStarred, setStarredSourceInstance, setStarredSourceInstanceIds])

  const contextValue = useMemo(
    () => ({
      id,
      source,
      sourceParams: savedParams,
      draftSourceParams: draftParams,
      hasSourceParams: hasParams,
      hasSourceParamChanges: isDirty,
      items,
      isFetching,
      isStarred,
      isFork: source.isFork,
      onRefresh: refetch,
      onToggleStar: handleToggleStar,
      onFork: handleFork,
      onDelete: handleDelete,
      onSourceParamChange: updateDraftParam,
      onSaveSourceParams: handleSaveSourceParams,
      onResetSourceParams: handleResetSourceParams,
      onDiscardSourceParams: discardDraftParams,
      onFlip: () => setIsFlipped(prev => !prev),
      dragHandle,
      updatedTime,
    }),
    [id, source, savedParams, draftParams, hasParams, isDirty, items, isFetching, isStarred, refetch, handleToggleStar, handleFork, handleDelete, updateDraftParam, handleSaveSourceParams, handleResetSourceParams, discardDraftParams, dragHandle, updatedTime],
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
