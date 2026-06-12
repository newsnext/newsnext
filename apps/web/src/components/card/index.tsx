import type { ReactNode } from "react"
import type { BoardSource, NewsItem } from "@/typings/source"
import { useMutation } from "@tanstack/react-query"
import { useSetAtom } from "jotai"
import { useInView } from "motion/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FlipAnimate } from "@/components/common/flip-animate"
import { useSourceParams } from "@/hooks"
import { useSourceQuery } from "@/hooks/use-source-query"
import { orpc } from "@/lib/orpc"
import { cn } from "@/lib/utils"
import {
  resetInstanceParamsAtom,
  upsertInstanceAtom,
} from "@/store/board"
import { useExpandedPreview } from "../preview/expanded-preview-context"
import { CardBack } from "./card-back"
import { CardPreviewContext } from "./card-context"
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
  const upsertLocal = useSetAtom(upsertInstanceAtom)
  const resetLocalParams = useSetAtom(resetInstanceParamsAtom)
  const upsertSourceInstance = useMutation(orpc.upsertSourceInstance.mutationOptions({ onError: () => {} }))
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

  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev)
  }, [])

  const handleSaveSourceParams = useCallback(() => {
    const nextParams = saveDraftParams()
    const nextInstance = {
      instanceId: id,
      sourceId: source.sourceId,
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

  const handleOpenExpandedPreview = useCallback((item: NewsItem) => {
    openExpandedPreview(id, source, item)
  }, [id, source, openExpandedPreview])

  const previewContextValue = useMemo(
    () => ({
      onOpenExpandedPreview: handleOpenExpandedPreview,
      canOpenExpandedPreview: !disableExpandedPreview,
      canShowHoverPreview: HOVER_PREVIEW_ENABLED && !isExpandedPreviewOpen,
    }),
    [handleOpenExpandedPreview, disableExpandedPreview, isExpandedPreviewOpen],
  )

  return (
    <CardPreviewContext.Provider value={previewContextValue}>
      <FlipAnimate
        rotate="y"
        flipped={isFlipped}
      >
        <CardFront
          id={id}
          source={source}
          items={items}
          isFetching={isFetching}
          updatedTime={updatedTime}
          onRefresh={refetch}
          onFlip={handleFlip}
          dragHandle={isFlipped ? undefined : dragHandle}
          previewSelection={previewSelection}
        />
        <CardBack
          id={id}
          source={source}
          sourceParams={savedParams}
          draftSourceParams={draftParams}
          hasSourceParams={hasParams}
          hasSourceParamChanges={isDirty}
          updatedTime={updatedTime}
          onSourceParamChange={updateDraftParam}
          onSaveSourceParams={handleSaveSourceParams}
          onResetSourceParams={handleResetSourceParams}
          onDiscardSourceParams={discardDraftParams}
          onFlip={handleFlip}
          dragHandle={isFlipped ? dragHandle : undefined}
        />
      </FlipAnimate>
    </CardPreviewContext.Provider>
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
