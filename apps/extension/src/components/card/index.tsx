import type { ReactNode } from "react"
import type { BoardSourceItems } from "@/components/board-items-context"
import type { BoardFilter } from "@/lib/board"
import type { SourceInstanceMetadata, SourceInstancePatch } from "@/lib/source"
import type { CardViewModel } from "@/typings/source"
import { FlipAnimate } from "@newsnext/ui/components/flip-animate"
import { useScrollProgressActionsContext } from "@newsnext/ui/components/scroll-progress-context"
import { useSetAtom } from "jotai"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useReportBoardSourceItems } from "@/components/board-items-context"
import { useSourceParams } from "@/hooks"
import { useInView } from "@/hooks/use-in-view"
import { useSourcePermission } from "@/hooks/use-source-permission"
import { useSourceQuery } from "@/hooks/use-source-query"
import { filterBoardItems } from "@/lib/board"
import { applySourceLoaderMetadata, SOURCE_QUERY_OFFSCREEN_RETENTION_MS, SOURCE_QUERY_PRELOAD_MARGIN } from "@/lib/source"
import { cn } from "@/lib/utils"
import {
  resetInstanceParamsAtom,
  setSourceInstancePatchAtom,
} from "@/store/board"
import { CardBack } from "./card-back"
import { CardFront } from "./card-front"

const EMPTY_ITEMS: BoardSourceItems["items"] = []

export interface SourceCardProps {
  filter?: BoardFilter
  id: string
  source: CardViewModel
  className?: string
  sizeClassName?: string
  nodeRef?: (node: HTMLElement | null) => void
  dragHandle?: ReactNode
  forceMount?: boolean
  isDraft?: boolean
  onDraftSourceChange?: (patch: SourceInstancePatch) => void
}

function SourceCardContent({ filter, id, source, dragHandle, isDraft = false, onDraftSourceChange }: SourceCardProps) {
  const reportBoardSourceItems = useReportBoardSourceItems()
  const setSourceInstancePatch = useSetAtom(setSourceInstancePatchAtom)
  const resetLocalParams = useSetAtom(resetInstanceParamsAtom)
  const [isFlipped, setIsFlipped] = useState(false)
  const {
    hasParams,
    savedParams,
    draftParams,
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
  const visibleItems = useMemo(
    () => filterBoardItems(items, filter),
    [filter, items],
  )

  useEffect(() => {
    if (isDraft) return

    reportBoardSourceItems?.({
      card: displaySource,
      filter,
      id,
      items: canLoad ? visibleItems : EMPTY_ITEMS,
      isLoading,
      updatedAt,
    })
  }, [canLoad, displaySource, filter, id, isDraft, isLoading, reportBoardSourceItems, updatedAt, visibleItems])

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
      <CardFront
        source={displaySource}
        items={visibleItems}
        isFetching={isFetching || isFetchingLatest}
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

export function SourceCard(props: SourceCardProps): React.JSX.Element {
  const { forceMount = false, nodeRef } = props
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
      {(isInView || forceMount) && (
        <SourceCardContent {...props} />
      )}
    </div>
  )
}
