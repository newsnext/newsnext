import type { LiveCardDragHandleRef } from "./card-header"
import type { InstanceMetadata, InstancePatch } from "@/lib/source"
import type { LiveCardViewModel } from "@/typings/source"
import { FlipAnimate } from "@newsnext/ui/components/flip-animate"
import { useScrollProgressContext } from "@newsnext/ui/components/scroll-progress-context"
import { useQueryClient } from "@tanstack/react-query"
import { useSetAtom } from "jotai"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSourceParams } from "@/hooks"
import { createInstanceQueryTarget, getSourceQueryKey } from "@/hooks/source-query"
import { APP_INTEGRATION_STATUS_QUERY_KEY, useAppIntegrationStatus } from "@/hooks/use-app-integration-status"
import { useAsyncAction } from "@/hooks/use-async-action"
import { useI18n } from "@/hooks/use-i18n"
import { useInView } from "@/hooks/use-in-view"
import { useSourcePermission } from "@/hooks/use-source-permission"
import { useSourceQuery } from "@/hooks/use-source-query"
import { actions } from "@/lib/actions"
import { applySourceLoaderMetadata, applySourceSnapshot, SOURCE_QUERY_OFFSCREEN_RETENTION_MS, SOURCE_QUERY_PRELOAD_MARGIN } from "@/lib/source"
import { cn } from "@/lib/utils"
import {
  resetInstanceParamsAtom,
  setInstancePatchAtom,
} from "@/store/board"
import { LiveCardBack } from "./card-back"
import { LiveCardFront } from "./card-front"

export type LiveCardTarget
  = | {
    kind: "instance"
    instanceId: string
  }
  | {
    kind: "draft"
    onPatchChange: (patch: InstancePatch) => void
  }

export interface LiveCardProps {
  source: LiveCardViewModel
  target: LiveCardTarget
  eager?: boolean
  className?: string
  sizeClassName?: string
  nodeRef?: (node: HTMLElement | null) => void
  dragHandleRef?: LiveCardDragHandleRef
}

function LiveCardContent({ source, target, dragHandleRef }: LiveCardProps) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const setInstancePatch = useSetAtom(setInstancePatchAtom)
  const resetLocalParams = useSetAtom(resetInstanceParamsAtom)
  const [isFlipped, setIsFlipped] = useState(false)
  const instanceId = target.kind === "instance" ? target.instanceId : undefined
  const appIntegrationStatus = useAppIntegrationStatus(instanceId !== undefined)
  const instanceQueryKey = useMemo(
    () => instanceId
      ? getSourceQueryKey(createInstanceQueryTarget(instanceId))
      : undefined,
    [instanceId],
  )
  const offlineWorker = useMemo(
    () => instanceId
      ? appIntegrationStatus.data?.offlineWorkers.find(worker => (
          worker.instanceIds.includes(instanceId)
        ))
      : undefined,
    [appIntegrationStatus.data?.offlineWorkers, instanceId],
  )
  const routingResolved = instanceId === undefined
    || appIntegrationStatus.data !== undefined
    || appIntegrationStatus.isError
  useEffect(() => {
    if (offlineWorker && instanceQueryKey) {
      void queryClient.cancelQueries({ exact: true, queryKey: instanceQueryKey })
    }
  }, [instanceQueryKey, offlineWorker, queryClient])
  const { items, inlinePresentation, metadata, sourceSnapshot, manualRequest, isFetching, isManualRequesting, isLoading, isError, errorMessage, loginUrl, loadedAt } = useSourceQuery({
    source,
    sourceId: source.sourceId,
    instanceId,
    params: source.paramsValue,
    enabled: routingResolved && offlineWorker === undefined,
  })
  const resolvedSource = useMemo(
    () => sourceSnapshot ? applySourceSnapshot(source, sourceSnapshot) : source,
    [source, sourceSnapshot],
  )
  const {
    error: takeoverError,
    isPending: isTakingOver,
    run: runTakeover,
  } = useAsyncAction(t("takeOverLiveCardFailed"))
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
    ? errorMessage
      ? t("loadSourceFailedWithError", { error: errorMessage })
      : t("loadSourceFailed")
    : undefined
  const displaySource = useMemo(
    () => applySourceLoaderMetadata(resolvedSource, metadata),
    [metadata, resolvedSource],
  )
  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev)
  }, [])

  const handleTakeOver = useCallback(async (): Promise<void> => {
    if (!offlineWorker || !instanceId || !instanceQueryKey) return
    await runTakeover(async () => {
      const status = await actions.appIntegration.takeOverWorker({
        instanceIds: [instanceId],
        workerId: offlineWorker.id,
      })
      queryClient.removeQueries({ exact: true, queryKey: instanceQueryKey })
      queryClient.setQueryData(APP_INTEGRATION_STATUS_QUERY_KEY, status)
    })
  }, [instanceId, instanceQueryKey, offlineWorker, queryClient, runTakeover])

  const handleSaveSourceParams = useCallback(async () => {
    const nextParams = getDraftParams()
    if (target.kind === "draft") {
      target.onPatchChange({ params: nextParams })
      commitParams(nextParams)
      return
    }

    await setInstancePatch({ instanceId: target.instanceId, patch: { params: nextParams } })
    commitParams(nextParams)
  }, [commitParams, getDraftParams, setInstancePatch, target])

  const handleResetSourceParams = useCallback(async () => {
    if (target.kind === "draft") {
      target.onPatchChange({ params: {} })
      commitParams({})
      return
    }

    await resetLocalParams(target.instanceId)
    commitParams({})
  }, [commitParams, resetLocalParams, target])

  const handleSaveSourceMeta = useCallback(async (metadata: InstanceMetadata) => {
    if (target.kind === "draft") {
      target.onPatchChange({ metadata })
      return
    }

    await setInstancePatch({ instanceId: target.instanceId, patch: { metadata } })
  }, [setInstancePatch, target])

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
        sourceWorkerTakeover={offlineWorker
          ? {
              isPending: isTakingOver,
              message: takeoverError ?? t("workerOffline"),
              onTakeOver: () => void handleTakeOver(),
            }
          : undefined}
        loadedAt={loadedAt}
        onRefresh={manualRequest}
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
        loadedAt={loadedAt}
        onSourceParamChange={updateDraftParam}
        onSaveSourceParams={handleSaveSourceParams}
        onResetSourceParams={handleResetSourceParams}
        onDiscardSourceParams={discardDraftParams}
        onSaveSourceMeta={handleSaveSourceMeta}
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
