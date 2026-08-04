import type { ReactNode } from "react"
import type { SourceInstanceMetadata, SourceInstancePatch } from "@/lib/source-cards"
import type { BoardSource } from "@/typings/source"
import { FlipAnimate } from "@newsnext/ui/components/flip-animate"
import { useScrollProgressActionsContext } from "@newsnext/ui/components/scroll-progress-context"
import { useSetAtom } from "jotai"
import { useCallback, useMemo, useRef, useState } from "react"
import { useSourceParams } from "@/hooks"
import { useInView } from "@/hooks/use-in-view"
import { useSourcePermission } from "@/hooks/use-source-permission"
import { useSourceQuery } from "@/hooks/use-source-query"
import { applySourceLoaderMetadata } from "@/lib/source-cards"
import {
  SOURCE_QUERY_OFFSCREEN_RETENTION_MS,
  SOURCE_QUERY_PRELOAD_MARGIN,
} from "@/lib/source-query-policy"
import { cn } from "@/lib/utils"
import {
  resetInstanceParamsAtom,
  setSourceInstancePatchAtom,
} from "@/store/board"
import { CardBack } from "./card-back"
import { CardFront } from "./card-front"

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
  const {
    canLoad,
    permissionDescription,
    permissionRequired,
    requestPermission,
  } = useSourcePermission(source, savedParams)

  const { items, metadata, fetchLatest, isFetching, isFetchingLatest, isLoading, isError, errorMessage, loginUrl, updatedAt } = useSourceQuery({
    sourceId: source.sourceId,
    params: savedParams,
    enabled: canLoad,
  })
  const sourceErrorMessage = canLoad && isError
    ? `Failed to load source${errorMessage ? `: ${errorMessage}` : "."}`
    : undefined
  const displaySource = useMemo(
    () => applySourceLoaderMetadata(source, metadata),
    [metadata, source],
  )

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
      className={displaySource.provider.color}
    >
      <CardFront
        source={displaySource}
        items={items}
        isFetching={isFetching}
        isContentFetching={isFetchingLatest || isLoading}
        sourceErrorMessage={sourceErrorMessage}
        sourceLoginUrl={canLoad ? loginUrl : undefined}
        sourcePermissionDescription={permissionDescription}
        sourcePermissionRequired={permissionRequired}
        updatedAt={updatedAt}
        onRefresh={fetchLatest}
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
  const { nodeRef } = props
  const { rootScrollContainerRef } = useScrollProgressActionsContext()
  const ref = useRef<HTMLDivElement>(null)
  const setRef = useCallback((node: HTMLDivElement | null) => {
    ref.current = node
    nodeRef?.(node)
  }, [nodeRef])

  const isInView = useInView(ref, {
    root: rootScrollContainerRef,
    margin: SOURCE_QUERY_PRELOAD_MARGIN,
    once: SOURCE_QUERY_OFFSCREEN_RETENTION_MS,
  })

  return (
    <div
      ref={setRef}
      className={cn(
        "select-none",
        props.sizeClassName ?? "h-125 w-100",
        props.className,
      )}
    >
      {isInView && (
        <CardContent {...props} />
      )}
    </div>
  )
}
