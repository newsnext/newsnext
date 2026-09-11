import type { ReactNode } from "react"
import type { CardDragHandleRef } from "@/components/card-shell/card-header"
import type { SourcePermissionRequest } from "@/lib/source"
import type { LiveCardViewModel, NewsItem } from "@/typings/source"
import { useMemo, useState } from "react"
import { CardShell } from "@/components/card-shell"
import { CardHeader, CardHeaderActionButton } from "@/components/card-shell/card-header"
import { CardContentBackground, CardContentTransition, CardRefreshButton } from "@/components/card-shell/card-refresh"
import { useI18n } from "@/hooks/use-i18n"
import { useSourceIcon } from "@/hooks/use-source-icon"
import { useSourceMarkScales } from "@/hooks/use-source-mark-scales"
import { getHostPermissionOrigins } from "@/lib/source"
import {
  PhInfoDuotone,
} from "../icons/ph"
import { LiveCardItems } from "./card-items"
import {
  SourceErrorState,
  SourceLoginState,
  SourcePermissionState,
  SourceStatusMessage,
  SourceStatusPattern,
  SourceWorkerTakeoverState,
} from "./card-source-state"
import { LiveCardIdentityContext } from "./live-card-identity-context"
import { SourcePermissionDetails } from "./source-permission-details"

interface LiveCardFrontProps {
  source: LiveCardViewModel
  items: NewsItem[]
  inlinePresentation?: string[]
  isFetching: boolean
  isContentFetching: boolean
  sourceErrorMessage?: string
  sourceLoginUrl?: string
  sourcePermissionRequest?: SourcePermissionRequest
  sourceWorkerTakeover?: {
    isPending: boolean
    message: string
    onTakeOver: () => void
  }
  onRefresh: () => void
  onRequestPermission: () => Promise<boolean>
  onFlip?: () => void
  actions?: ReactNode
  dragHandleRef?: CardDragHandleRef
}

interface LiveCardFrontContentProps {
  items: NewsItem[]
  inlinePresentation?: string[]
  markScale?: number
  providerTitle: string
  presentationType?: LiveCardViewModel["metadata"]["type"]
  scrollElement: HTMLDivElement | null
  sourceErrorMessage?: string
  sourceLoginUrl?: string
  sourcePermissionRequest?: SourcePermissionRequest
  sourceWorkerTakeover?: LiveCardFrontProps["sourceWorkerTakeover"]
  onRefresh: () => void
  onRequestPermission: () => Promise<boolean>
}

function LiveCardFrontContent({
  items,
  inlinePresentation,
  markScale,
  providerTitle,
  presentationType,
  scrollElement,
  sourceErrorMessage,
  sourceLoginUrl,
  sourcePermissionRequest,
  sourceWorkerTakeover,
  onRefresh,
  onRequestPermission,
}: LiveCardFrontContentProps) {
  if (sourceWorkerTakeover) {
    return (
      <SourceWorkerTakeoverState
        disabled={sourceWorkerTakeover.isPending}
        onTakeOver={sourceWorkerTakeover.onTakeOver}
      />
    )
  }

  if (sourcePermissionRequest) {
    return (
      <SourcePermissionState
        onRequestPermission={onRequestPermission}
      />
    )
  }

  if (sourceLoginUrl) {
    return (
      <SourceLoginState
        providerTitle={providerTitle}
        loginUrl={sourceLoginUrl}
      />
    )
  }

  if (sourceErrorMessage) {
    return (
      <SourceErrorState
        onRefresh={onRefresh}
      />
    )
  }

  return (
    <LiveCardItems
      items={items}
      inlinePresentation={inlinePresentation}
      markScale={markScale}
      presentationType={presentationType}
      scrollElement={scrollElement}
    />
  )
}

export function LiveCardFront({
  source,
  items,
  inlinePresentation,
  isFetching,
  isContentFetching,
  sourceErrorMessage,
  sourceLoginUrl,
  sourcePermissionRequest,
  sourceWorkerTakeover,
  onRefresh,
  onRequestPermission,
  onFlip,
  actions,
  dragHandleRef,
}: LiveCardFrontProps) {
  const { t } = useI18n()
  const { provider } = source
  const { badge, color, desc, home, title } = source.metadata
  const icon = useSourceIcon(source)
  const identity = useMemo(() => ({
    badge,
    icon,
    name: title || provider.title,
    color: color ?? provider.color,
  }), [badge, color, icon, provider.color, provider.title, title])
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null)
  const markScaleGroups = useMemo(
    () => [{ items, sourceKey: source.id }],
    [items, source.id],
  )
  const markScale = useSourceMarkScales(markScaleGroups).get(source.id)
  const visibleSourceErrorMessage = isContentFetching ? undefined : sourceErrorMessage
  const sourceStatusMessage = sourceWorkerTakeover
    ? sourceWorkerTakeover.message
    : sourcePermissionRequest
      ? (
          <SourcePermissionDetails
            cookieOrigins={getHostPermissionOrigins({
              cookies: source.capabilities.cookies,
              network: [],
            })}
            request={sourcePermissionRequest}
          />
        )
      : sourceLoginUrl
        ? t("logInToContinue", { provider: provider.title })
        : visibleSourceErrorMessage

  return (
    <CardShell header={(
      <CardHeader
        badge={badge}
        desc={desc}
        home={home}
        icon={icon}
        providerTitle={provider.title}
        title={title}
        dragHandleRef={dragHandleRef}
        actions={actions ?? (
          <>
            <CardRefreshButton isFetching={isFetching} onRefresh={onRefresh} />
            {onFlip && (
              <CardHeaderActionButton
                onClick={onFlip}
                aria-label={t("showLiveCardDetails")}
              >
                <PhInfoDuotone />
              </CardHeaderActionButton>
            )}
          </>
        )}
      />
    )}
    >
      {/* Content */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl">
        <CardContentBackground isFetching={isContentFetching} />
        {sourceStatusMessage && (
          <SourceStatusPattern icon={icon} />
        )}
        <div
          ref={setScrollElement}
          onPointerDown={event => event.stopPropagation()}
          className="relative size-full overflow-y-auto px-2 py-2"
        >
          <CardContentTransition isFetching={isContentFetching}>
            <LiveCardIdentityContext value={identity}>
              <LiveCardFrontContent
                items={items}
                inlinePresentation={inlinePresentation}
                markScale={markScale}
                providerTitle={provider.title}
                presentationType={source.metadata.type}
                scrollElement={scrollElement}
                sourceErrorMessage={visibleSourceErrorMessage}
                sourceLoginUrl={sourceLoginUrl}
                sourcePermissionRequest={sourcePermissionRequest}
                sourceWorkerTakeover={sourceWorkerTakeover}
                onRefresh={onRefresh}
                onRequestPermission={onRequestPermission}
              />
            </LiveCardIdentityContext>
          </CardContentTransition>
        </div>
        {sourceStatusMessage && (
          <SourceStatusMessage
            message={sourceStatusMessage}
          />
        )}
      </div>
    </CardShell>
  )
}
