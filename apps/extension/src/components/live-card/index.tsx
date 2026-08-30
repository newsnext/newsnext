import type { LiveCardDragHandleRef } from "./card-header"
import type { InstanceMetadata, InstancePatch } from "@/lib/source"
import type { LiveCardViewModel } from "@/typings/source"
import { FlipAnimate } from "@newsnext/ui/components/flip-animate"
import { useScrollProgressContext } from "@newsnext/ui/components/scroll-progress-context"
import { useSetAtom } from "jotai"
import { useCallback, useMemo, useRef, useState } from "react"
import { useSourceParams } from "@/hooks"
import { useInView } from "@/hooks/use-in-view"
import { useSourcePermission } from "@/hooks/use-source-permission"
import { useSourceQuery } from "@/hooks/use-source-query"
import { applySourceLoaderMetadata, applySourceSnapshot, SOURCE_QUERY_OFFSCREEN_RETENTION_MS, SOURCE_QUERY_PRELOAD_MARGIN } from "@/lib/source"
import { cn } from "@/lib/utils"
import {
  resetInstanceParamsAtom,
  setInstancePatchAtom,
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
  onDraftSourceChange?: (patch: InstancePatch) => void
}

function LiveCardContent({ id, source, dragHandleRef, isDraft = false, onDraftSourceChange }: LiveCardProps) {
  const setInstancePatch = useSetAtom(setInstancePatchAtom)
  const resetLocalParams = useSetAtom(resetInstanceParamsAtom)
  const [isFlipped, setIsFlipped] = useState(false)
  const { items, inlinePresentation, metadata, sourceSnapshot, manualRequest, isFetching, isManualRequesting, isLoading, isError, errorMessage, loginUrl, loadedAt } = useSourceQuery({
    source,
    sourceId: source.sourceId,
    instanceId: isDraft ? undefined : id,
    params: source.paramsValue,
    enabled: true,
  })
  const resolvedSource = useMemo(
    () => sourceSnapshot ? applySourceSnapshot(source, sourceSnapshot) : source,
    [source, sourceSnapshot],
  )
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
    params: resolvedSource.params,
    initialValues: resolvedSource.paramsValue,
  })
  const {
    missingPermission,
    requestPermission,
  } = useSourcePermission(resolvedSource, savedParams)
  const sourceErrorMessage = isError
    ? `Failed to load source${errorMessage ? `: ${errorMessage}` : "."}`
    : undefined
  const displaySource = useMemo(
    () => applySourceLoaderMetadata(resolvedSource, metadata),
    [metadata, resolvedSource],
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

    await setInstancePatch({ instanceId: id, patch: { params: nextParams } })
    commitParams(nextParams)
  }, [commitParams, getDraftParams, id, onDraftSourceChange, setInstancePatch])

  const handleResetSourceParams = useCallback(async () => {
    if (onDraftSourceChange) {
      onDraftSourceChange({ params: {} })
      commitParams({})
      return
    }

    await resetLocalParams(id)
    commitParams({})
  }, [commitParams, id, onDraftSourceChange, resetLocalParams])

  const handleSaveSourceMeta = useCallback(async (metadata: InstanceMetadata) => {
    if (onDraftSourceChange) {
      onDraftSourceChange({ metadata })
      return
    }

    await setInstancePatch({ instanceId: id, patch: { metadata } })
  }, [id, onDraftSourceChange, setInstancePatch])

  return (
    <FlipAnimate
      rotate="y"
      flipped={isFlipped}
      className={displaySource.provider.color}
    >
      <LiveCardFront
        source={displaySource}
        items={items}
        inlinePresentation={inlinePresentation}
        isFetching={isFetching || isManualRequesting}
        isContentFetching={isManualRequesting || isLoading}
        sourceErrorMessage={sourceErrorMessage}
        sourceLoginUrl={loginUrl}
        sourcePermissionRequest={missingPermission}
        loadedAt={loadedAt}
        onRefresh={manualRequest}
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
        loadedAt={loadedAt}
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
