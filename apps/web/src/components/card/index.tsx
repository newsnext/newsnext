import type { ReactNode } from "react"
import type { BoardSource, NewsItem } from "@/typings/source"
import { useMutation } from "@tanstack/react-query"
import { useAtomValue, useSetAtom } from "jotai"
import { useInView } from "motion/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FlipAnimate } from "@/components/common/flip-animate"
import { useSourceParams } from "@/hooks"
import { useSourceQuery } from "@/hooks/use-source-query"
import { orpc } from "@/lib/orpc"
import { createForkedInstance } from "@/lib/source-cards"
import { deleteStoredSourceParamValues, writeStoredSourceParamValues } from "@/lib/source-params"
import { cn } from "@/lib/utils"
import {
  deleteInstanceAtom,
  instanceStarredAtom,
  resetInstanceParamsAtom,
  starInstanceAtom,
  upsertInstanceAtom,
} from "@/store/board"
import { useExpandedPreview } from "../preview/expanded-preview-context"
import { CardBack } from "./card-back"
import { CardContext } from "./card-context"
import { CardFront } from "./card-front"

const HOVER_PREVIEW_ENABLED = false

export interface CardProps {
  id: string
  source: BoardSource
  className?: string
  nodeRef?: (node: HTMLElement | null) => void
  dragHandle?: ReactNode
  disableExpandedPreview?: boolean
  previewSelection?: {
    selectedItemUrl?: string
    onSelectItem: (item: NewsItem) => void
  }
}

function CardContent({ id, source, dragHandle, disableExpandedPreview = false, previewSelection }: CardProps) {
  const { isExpandedPreviewOpen, openExpandedPreview } = useExpandedPreview()
  const isStarredAtom = useMemo(() => instanceStarredAtom(id), [id])
  const isStarred = useAtomValue(isStarredAtom)
  const upsertLocal = useSetAtom(upsertInstanceAtom)
  const deleteLocal = useSetAtom(deleteInstanceAtom)
  const resetLocalParams = useSetAtom(resetInstanceParamsAtom)
  const starLocal = useSetAtom(starInstanceAtom)
  const upsertSourceInstance = useMutation(orpc.upsertSourceInstance.mutationOptions({ onError: () => {} }))
  const deleteSourceInstance = useMutation(orpc.deleteSourceInstance.mutationOptions({ onError: () => {} }))
  const setStarredSourceInstance = useMutation(orpc.setStarredSourceInstance.mutationOptions({ onError: () => {} }))
  const resetSourceInstanceParams = useMutation(orpc.resetSourceInstanceParams.mutationOptions({ onError: () => {} }))
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
  //   normalRefetch()
  // }, [date, normalRefetch])

  const handleFork = useCallback(() => {
    const forkedInstance = createForkedInstance(source.sourceId, savedParams)

    writeStoredSourceParamValues(forkedInstance.instanceId, savedParams)
    upsertSourceInstance.mutate(forkedInstance)
    upsertLocal(forkedInstance)

    if (isStarred) {
      starLocal({ instanceId: forkedInstance.instanceId, starred: true })
      setStarredSourceInstance.mutate({ instanceId: forkedInstance.instanceId, starred: true })
    }
  }, [source.sourceId, isStarred, savedParams, starLocal, setStarredSourceInstance, upsertLocal, upsertSourceInstance])

  const handleDelete = useCallback(() => {
    if (!source.isFork) {
      return
    }

    deleteLocal(id)
    deleteStoredSourceParamValues(id)
    deleteSourceInstance.mutate({ instanceId: id })
  }, [deleteLocal, deleteSourceInstance, source.isFork, id])

  const handleSaveSourceParams = useCallback(() => {
    const nextParams = saveDraftParams()
    const nextInstance = {
      instanceId: id,
      sourceKey: source.sourceId,
      params: nextParams,
      isFork: source.isFork,
      createdAt: Date.now(),
    }

    upsertLocal(nextInstance)
    upsertSourceInstance.mutate(nextInstance)
  }, [source.sourceId, source.isFork, id, saveDraftParams, upsertLocal, upsertSourceInstance])

  const handleResetSourceParams = useCallback(() => {
    resetDraftParams()
    resetSourceInstanceParams.mutate({ instanceId: id })
    resetLocalParams({ instanceId: id, isFork: source.isFork })
  }, [source.isFork, id, resetDraftParams, resetLocalParams, resetSourceInstanceParams])

  const handleToggleStar = useCallback(() => {
    const nextIsStarred = !isStarred
    starLocal({ instanceId: id, starred: nextIsStarred })
    setStarredSourceInstance.mutate({ instanceId: id, starred: nextIsStarred })
  }, [id, isStarred, starLocal, setStarredSourceInstance])

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
      onOpenExpandedPreview: (item: NewsItem) => openExpandedPreview(id, source, item),
      canOpenExpandedPreview: !disableExpandedPreview,
      canShowHoverPreview: HOVER_PREVIEW_ENABLED && !isExpandedPreviewOpen,
      previewSelection,
      dragHandle,
      updatedTime,
    }),
    [id, source, savedParams, draftParams, hasParams, isDirty, items, isFetching, isStarred, refetch, handleToggleStar, handleFork, handleDelete, updateDraftParam, handleSaveSourceParams, handleResetSourceParams, discardDraftParams, openExpandedPreview, disableExpandedPreview, isExpandedPreviewOpen, previewSelection, dragHandle, updatedTime],
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
  const [hasEnteredView, setHasEnteredView] = useState(false)
  const setRef = (node: HTMLDivElement | null) => {
    ref.current = node
    props.nodeRef?.(node)
  }

  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (isInView) {
      setHasEnteredView(true)
    }
  }, [isInView])

  return (
    <div
      ref={setRef}
      className={cn(
        "h-125 w-100",
        props.className,
      )}
    >
      {hasEnteredView && (
        <CardContent {...props} />
      )}
    </div>
  )
}
