import type { ReactNode } from "react"
import type { SourceInstanceMetadata, SourceInstancePatch } from "@/lib/source-cards"
import type { BoardSource } from "@/typings/source"
import { useSetAtom } from "jotai"
import { useInView } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { FlipAnimate } from "@/components/common/flip-animate"
import { useSourceParams } from "@/hooks"
import { useSourcePermission } from "@/hooks/use-source-permission"
import { useSourceQuery } from "@/hooks/use-source-query"
import { getSourcePermissionDescription } from "@/lib/source-permissions"
import { cn } from "@/lib/utils"
import {
  resetInstanceParamsAtom,
  setSourceInstancePatchAtom,
} from "@/store/board"
import { CardBack } from "./card-back"
import { CardFront } from "./card-front"

const CARD_IN_VIEW_MARGIN = "200px"

export interface CardProps {
  id: string
  source: BoardSource
  className?: string
  sizeClassName?: string
  nodeRef?: (node: HTMLElement | null) => void
  dragHandle?: ReactNode
  isDraft?: boolean
  onDraftSourceChange?: (patch: SourceInstancePatch) => void
}

function CardContent({ id, source, dragHandle, isDraft = false, onDraftSourceChange }: CardProps) {
  const setSourceInstancePatch = useSetAtom(setSourceInstancePatchAtom)
  const resetLocalParams = useSetAtom(resetInstanceParamsAtom)
  const [isFlipped, setIsFlipped] = useState(false)
  const {
    canLoad,
    permissionRequired,
    requestPermission,
  } = useSourcePermission(source)
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
    params: source.params,
    initialValues: source.paramsValue,
  })

  const { items, metadata, refetch, isFetching, isError, errorMessage, loginUrl, updatedAt } = useSourceQuery({
    sourceId: source.sourceId,
    params: savedParams,
    enabled: canLoad,
  })
  const sourceErrorMessage = canLoad && isError
    ? `Failed to load source${errorMessage ? `: ${errorMessage}` : "."}`
    : undefined
  const displaySource = metadata
    ? {
        ...source,
        metadata: {
          ...source.metadata,
          ...metadata,
        },
      }
    : source

  // useEffect(() => {
  //   normalRefetch()
  // }, [date, normalRefetch])

  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev)
  }, [])

  const handleSaveSourceParams = useCallback(() => {
    const nextParams = saveDraftParams()
    if (onDraftSourceChange) {
      onDraftSourceChange({ params: nextParams })
      return
    }

    setSourceInstancePatch({ instanceId: id, patch: { params: nextParams } })
  }, [id, onDraftSourceChange, saveDraftParams, setSourceInstancePatch])

  const handleResetSourceParams = useCallback(() => {
    resetDraftParams()
    if (onDraftSourceChange) {
      onDraftSourceChange({ params: {} })
      return
    }

    resetLocalParams(id)
  }, [id, onDraftSourceChange, resetDraftParams, resetLocalParams])

  const handleSaveSourceMeta = useCallback((metadata: SourceInstanceMetadata) => {
    if (onDraftSourceChange) {
      onDraftSourceChange({ metadata })
      return
    }

    setSourceInstancePatch({ instanceId: id, patch: { metadata } })
  }, [id, onDraftSourceChange, setSourceInstancePatch])

  return (
    <FlipAnimate
      rotate="y"
      flipped={isFlipped}
    >
      <CardFront
        source={displaySource}
        items={items}
        isFetching={isFetching}
        sourceErrorMessage={sourceErrorMessage}
        sourceLoginUrl={canLoad ? loginUrl : undefined}
        sourcePermissionDescription={getSourcePermissionDescription(source)}
        sourcePermissionRequired={permissionRequired}
        updatedAt={updatedAt}
        onRefresh={refetch}
        onRequestPermission={requestPermission}
        onFlip={handleFlip}
        dragHandle={isFlipped ? undefined : dragHandle}
      />
      <CardBack
        id={id}
        source={displaySource}
        draftSourceParams={draftParams}
        hasSourceParams={hasParams}
        hasSourceParamChanges={isDirty}
        updatedAt={updatedAt}
        onSourceParamChange={updateDraftParam}
        onSaveSourceParams={handleSaveSourceParams}
        onResetSourceParams={handleResetSourceParams}
        onDiscardSourceParams={discardDraftParams}
        onSaveSourceMeta={handleSaveSourceMeta}
        onFlip={handleFlip}
        isDraft={isDraft}
        dragHandle={isFlipped ? dragHandle : undefined}
      />
    </FlipAnimate>
  )
}

export default function Card(props: CardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [hasEnteredView, setHasEnteredView] = useState(false)
  const setRef = (node: HTMLDivElement | null) => {
    ref.current = node
    props.nodeRef?.(node)
  }

  const isInView = useInView(ref, { once: true, margin: CARD_IN_VIEW_MARGIN })

  useEffect(() => {
    if (isInView) {
      setHasEnteredView(true)
    }
  }, [isInView])

  return (
    <div
      ref={setRef}
      className={cn(
        "select-none",
        props.sizeClassName ?? "h-125 w-100",
        props.className,
      )}
    >
      {hasEnteredView && (
        <CardContent {...props} />
      )}
    </div>
  )
}
