import type { CardDragHandleRef } from "@/components/card-shell/card-header"
import type { LiveCardMetadata, LiveCardPatch } from "@/lib/source"
import type { LiveCardViewModel } from "@/typings/source"
import { FlipAnimate } from "@newsnext/ui/components/flip-animate"
import { useScrollProgressContext } from "@newsnext/ui/components/scroll-progress-context"
import { cn } from "@newsnext/ui/lib/utils"
import { useSetAtom } from "jotai"
import { useCallback, useRef, useState } from "react"
import { useSourceParams } from "@/hooks"
import { useInView } from "@/hooks/use-in-view"
import { useLiveCardRenderModel } from "@/hooks/use-live-card-render-model"
import { useSourcePermission } from "@/hooks/use-source-permission"
import { actions } from "@/lib/actions"
import { SOURCE_QUERY_OFFSCREEN_RETENTION_MS, SOURCE_QUERY_PRELOAD_MARGIN } from "@/lib/source"
import {
  resetLiveCardParamsAtom,
  setLiveCardPatchAtom,
} from "@/store/board"
import { LiveCardBack } from "./card-back"
import { LiveCardFront } from "./card-front"

export type LiveCardTarget
  = | {
    kind: "card"
    cardId: string
  }
  | {
    kind: "draft"
    onPatchChange: (patch: LiveCardPatch) => void
  }

export interface LiveCardProps {
  source: LiveCardViewModel
  target: LiveCardTarget
  /** Bypass viewport deferral. Only the dialog-portal search preview may set this; board cards always defer. */
  eager?: boolean
  className?: string
  sizeClassName?: string
  nodeRef?: (node: HTMLElement | null) => void
  dragHandleRef?: CardDragHandleRef
}

function LiveCardContent({ source, target, dragHandleRef }: LiveCardProps) {
  const setLiveCardPatch = useSetAtom(setLiveCardPatchAtom)
  const resetLocalParams = useSetAtom(resetLiveCardParamsAtom)
  const [isFlipped, setIsFlipped] = useState(false)
  const cardId = target.kind === "card" ? target.cardId : undefined
  const {
    source: displaySource,
    items,
    inlinePresentation,
    isContentFetching,
    sourceErrorMessage,
    sourceLoginUrl,
    sourceWorkerTakeover,
    refetch,
  } = useLiveCardRenderModel({ cardId, source })
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
    params: displaySource.params,
    initialValues: displaySource.paramsValue,
  })
  const {
    missingPermission,
    requestPermission,
  } = useSourcePermission(displaySource, savedParams)
  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev)
  }, [])

  const handleSaveSourceParams = useCallback(async () => {
    const nextParams = getDraftParams()
    if (target.kind === "draft") {
      target.onPatchChange({ params: nextParams })
      commitParams(nextParams)
      return
    }

    await setLiveCardPatch({ cardId: target.cardId, patch: { params: nextParams } })
    commitParams(nextParams)
  }, [commitParams, getDraftParams, setLiveCardPatch, target])

  const handleResetSourceParams = useCallback(async () => {
    if (target.kind === "draft") {
      target.onPatchChange({ params: {} })
      commitParams({})
      return
    }

    await resetLocalParams(target.cardId)
    commitParams({})
  }, [commitParams, resetLocalParams, target])

  const handleSaveSourceMeta = useCallback(async (metadata: LiveCardMetadata) => {
    if (target.kind === "draft") {
      target.onPatchChange({ metadata })
      return
    }

    await setLiveCardPatch({ cardId: target.cardId, patch: { metadata } })
  }, [setLiveCardPatch, target])

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
        isContentFetching={isContentFetching}
        sourceErrorMessage={sourceErrorMessage}
        sourceLoginUrl={sourceLoginUrl}
        sourcePermissionRequest={missingPermission}
        sourceWorkerTakeover={sourceWorkerTakeover}
        onRefresh={() => void refetch()}
        onRequestPermission={requestPermission}
        onFlip={handleFlip}
        dragHandleRef={isFlipped ? undefined : dragHandleRef}
      />
      <LiveCardBack
        source={displaySource}
        target={target}
        draftSourceParams={draftParams}
        hasSourceParams={hasParams}
        hasSourceParamChanges={isDirty}
        sourceParamValidation={validation}
        onSourceParamChange={updateDraftParam}
        onSaveSourceParams={handleSaveSourceParams}
        onResetSourceParams={handleResetSourceParams}
        onDiscardSourceParams={discardDraftParams}
        onSaveSourceMeta={handleSaveSourceMeta}
        onResetSourceMeta={target.kind === "card"
          ? async () => {
            await actions.liveCard.resetMetadata({ cardId: target.cardId })
          }
          : undefined}
        onFlip={handleFlip}
        dragHandleRef={isFlipped ? dragHandleRef : undefined}
      />
    </FlipAnimate>
  )
}

export function LiveCard(props: LiveCardProps): React.JSX.Element {
  const { eager = false, nodeRef } = props
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
      {(eager || isInView) && (
        <LiveCardContent {...props} />
      )}
    </div>
  )
}
