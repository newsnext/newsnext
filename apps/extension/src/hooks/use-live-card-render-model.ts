import type { LiveCardViewModel, NewsItem } from "@/typings/source"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo } from "react"
import { actions } from "@/lib/actions"
import { applySourceDescriptor, applySourceLoaderMetadata, applySourceSnapshot } from "@/lib/source"
import { createLiveCardQueryTarget, getSourceQueryKey } from "./source-query"
import { useAsyncAction } from "./use-async-action"
import { useI18n } from "./use-i18n"
import { NATIVE_INTEGRATION_STATUS_QUERY_KEY, useNativeIntegrationStatus } from "./use-native-integration-status"
import { useSourceDescriptor } from "./use-source-descriptor"
import { useSourceQuery } from "./use-source-query"

const EMPTY_ITEMS: NewsItem[] = []

interface UseLiveCardRenderModelOptions {
  cardId?: string
  source: LiveCardViewModel
}

/** Owns the runtime state and actions needed to render a LiveCard front. */
export function useLiveCardRenderModel({ cardId, source }: UseLiveCardRenderModelOptions) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const nativeIntegrationStatus = useNativeIntegrationStatus(cardId !== undefined)
  const liveCardQueryKey = useMemo(
    () => cardId
      ? getSourceQueryKey(createLiveCardQueryTarget(cardId))
      : undefined,
    [cardId],
  )
  const offlineWorker = useMemo(
    () => cardId
      ? nativeIntegrationStatus.data?.offlineWorkers.find(worker => worker.cardIds.includes(cardId))
      : undefined,
    [cardId, nativeIntegrationStatus.data?.offlineWorkers],
  )
  const routingResolved = cardId === undefined
    || nativeIntegrationStatus.data !== undefined
    || nativeIntegrationStatus.isError
  const {
    error: takeoverError,
    isPending: isTakingOver,
    run: runTakeover,
  } = useAsyncAction(t("takeOverLiveCardFailed"))

  useEffect(() => {
    if (offlineWorker && liveCardQueryKey) {
      void queryClient.cancelQueries({ exact: true, queryKey: liveCardQueryKey })
    }
  }, [liveCardQueryKey, offlineWorker, queryClient])

  const query = useSourceQuery({
    source,
    sourceId: source.sourceId,
    cardId,
    params: source.paramsValue,
    // Cached content is Worker-local and can be read immediately. Only fresh
    // execution depends on routing and Worker availability.
    freshLoadEnabled: routingResolved && offlineWorker === undefined,
  })
  const { descriptor, descriptorError, isDescriptorPending } = useSourceDescriptor(
    source.sourceId,
    { enabled: cardId !== undefined },
  )
  const resolvedSource = query.result?.source
    ? applySourceSnapshot(source, query.result.source)
    : descriptor
      ? applySourceDescriptor(source, descriptor)
      : source
  const displaySource = applySourceLoaderMetadata(resolvedSource, query.result?.metadata)
  const takeOver = useCallback(async (): Promise<void> => {
    if (!offlineWorker || !cardId || !liveCardQueryKey) return
    await runTakeover(async () => {
      const status = await actions.nativeIntegration.takeOver({
        cardIds: [cardId],
        workerId: offlineWorker.id,
      })
      queryClient.removeQueries({ exact: true, queryKey: liveCardQueryKey })
      queryClient.setQueryData(NATIVE_INTEGRATION_STATUS_QUERY_KEY, status)
    })
  }, [cardId, liveCardQueryKey, offlineWorker, queryClient, runTakeover])
  // A removed definition is an error: retained items must not outlive the
  // executable Source definition that gives them meaning.
  const isDefinitionMissing = cardId !== undefined
    && !isDescriptorPending
    && descriptorError !== undefined
  const sourceErrorMessage = isDefinitionMissing
    ? t("loadSourceFailedWithError", { error: descriptorError.message || source.sourceId })
    : query.isError
      ? query.errorMessage
        ? t("loadSourceFailedWithError", { error: query.errorMessage })
        : t("loadSourceFailed")
      : undefined

  return {
    source: displaySource,
    items: isDefinitionMissing ? EMPTY_ITEMS : query.result?.items ?? EMPTY_ITEMS,
    inlinePresentation: isDefinitionMissing ? undefined : query.result?.inlinePresentation,
    isContentFetching: !isDefinitionMissing && query.isLoading,
    sourceErrorMessage,
    sourceLoginUrl: isDefinitionMissing ? undefined : query.loginUrl,
    sourceWorkerTakeover: offlineWorker
      ? {
          isPending: isTakingOver,
          message: takeoverError ?? t("workerOffline"),
          onTakeOver: () => void takeOver(),
        }
      : undefined,
    refetch: query.refetch,
  }
}
