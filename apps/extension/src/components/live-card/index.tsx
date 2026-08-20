import type { LiveCardDragHandleRef } from "./card-header"
import type { SourceInstanceMetadata, SourceInstancePatch } from "@/lib/source"
import type { LiveCardViewModel } from "@/typings/source"
import { FlipAnimate } from "@newsnext/ui/components/flip-animate"
import { useScrollProgressContext } from "@newsnext/ui/components/scroll-progress-context"
import { useSetAtom } from "jotai"
import { useCallback, useMemo, useRef, useState } from "react"
import { useSourceParams } from "@/hooks"
import { useInView } from "@/hooks/use-in-view"
import { useSourcePermission } from "@/hooks/use-source-permission"
import { useSourceQuery } from "@/hooks/use-source-query"
import { applySourceLoaderMetadata, SOURCE_QUERY_OFFSCREEN_RETENTION_MS, SOURCE_QUERY_PRELOAD_MARGIN } from "@/lib/source"
import { cn } from "@/lib/utils"
import {
  resetInstanceParamsAtom,
  setSourceInstancePatchAtom,
} from "@/store/board"
import { LiveCardBack } from "./card-back"
import { LiveCardFront } from "./card-front"

export interface LiveCardProps {
  id: string
  source: LiveCardViewModel
  className?: string
  sizeClassName?: string
  nodeRef?: (node: HTMLElement | null) => void
  dragHandleRef?: LiveCardDragHandleRef
  isDraft?: boolean
  onDraftSourceChange?: (patch: SourceInstancePatch) => void
}

function LiveCardContent({ id, source, dragHandleRef, isDraft = false, onDraftSourceChange }: LiveCardProps) {
  const setSourceInstancePatch = useSetAtom(setSourceInstancePatchAtom)
  const resetLocalParams = useSetAtom(resetInstanceParamsAtom)
  const [isFlipped, setIsFlipped] = useState(false)
  const {
    hasParams,
    savedParams,
    draftParams,
    validation,
    isDirty,
    updateDraftParam,
    getDraftParams,
    commitParams,
    discardDraftParams,
  } = useSourceParams({
    params: source.params,
    initialValues: source.paramsValue,
  })
  const {
    canLoad,
    missingPermission,
    requestPermission,
  } = useSourcePermission(source, savedParams)

  const { items, itemTemplate, metadata, fetchLatest, isFetching, isFetchingLatest, isLoading, isError, errorMessage, loginUrl, updatedAt } = useSourceQuery({
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

  const handleSaveSourceParams = useCallback(async () => {
    const nextParams = getDraftParams()
    if (onDraftSourceChange) {
      onDraftSourceChange({ params: nextParams })
      commitParams(nextParams)
      return
    }

    await setSourceInstancePatch({ instanceId: id, patch: { params: nextParams } })
    commitParams(nextParams)
  }, [commitParams, getDraftParams, id, onDraftSourceChange, setSourceInstancePatch])

  const handleResetSourceParams = useCallback(async () => {
    if (onDraftSourceChange) {
      onDraftSourceChange({ params: {} })
      commitParams({})
      return
    }

    await resetLocalParams(id)
    commitParams({})
  }, [commitParams, id, onDraftSourceChange, resetLocalParams])

  const handleSaveSourceMeta = useCallback(async (metadata: SourceInstanceMetadata) => {
    if (onDraftSourceChange) {
      onDraftSourceChange({ metadata })
      return
    }

    await setSourceInstancePatch({ instanceId: id, patch: { metadata } })
  }, [id, onDraftSourceChange, setSourceInstancePatch])

  return (
    <FlipAnimate
      rotate="y"
      flipped={isFlipped}
      className={displaySource.provider.color}
    >
      <LiveCardFront
        source={displaySource}
        items={items}
        itemTemplate={itemTemplate}
        isFetching={isFetching || isFetchingLatest}
        isContentFetching={isFetchingLatest || isLoading}
        sourceErrorMessage={sourceErrorMessage}
        sourceLoginUrl={canLoad ? loginUrl : undefined}
        sourcePermissionRequest={missingPermission}
        updatedAt={updatedAt}
        onRefresh={fetchLatest}
        onRequestPermission={requestPermission}
        onFlip={handleFlip}
        dragHandleRef={isFlipped ? undefined : dragHandleRef}
      />
      <LiveCardBack
        id={id}
        source={displaySource}
        draftSourceParams={draftParams}
        hasSourceParams={hasParams}
        hasSourceParamChanges={isDirty}
        sourceParamValidation={validation}
        updatedAt={updatedAt}
        onSourceParamChange={updateDraftParam}
        onSaveSourceParams={handleSaveSourceParams}
        onResetSourceParams={handleResetSourceParams}
        onDiscardSourceParams={discardDraftParams}
        onSaveSourceMeta={handleSaveSourceMeta}
        onFlip={handleFlip}
        isDraft={isDraft}
        dragHandleRef={isFlipped ? dragHandleRef : undefined}
      />
    </FlipAnimate>
  )
}

export function LiveCard(props: LiveCardProps): React.JSX.Element {
  const { nodeRef } = props
  const { rootScrollContainerRef } = useScrollProgressContext()
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
        <LiveCardContent {...props} />
      )}
    </div>
  )
}
