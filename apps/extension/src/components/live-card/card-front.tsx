import type { ReactNode } from "react"
import type { LiveCardDragHandleRef } from "./card-header"
import type { SourcePermissionRequest } from "@/lib/source"
import type { LiveCardViewModel, NewsItem } from "@/typings/source"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { useMemo, useState } from "react"
import { useI18n } from "@/hooks/use-i18n"
import { useSourceIcon } from "@/hooks/use-source-icon"
import { useSourceMarkScales } from "@/hooks/use-source-mark-scales"
import { RelativeTime } from "@/hooks/useRelativeTime"
import { getHostPermissionOrigins, getNewsItemsPresentation } from "@/lib/source"
import { cn } from "@/lib/utils"
import {
  PhArrowCounterClockwiseDuotone,
  PhCircleDashedDuotone,
  PhInfoDuotone,
} from "../icons/ph"
import { LiveCardHeader, LiveCardHeaderActionButton } from "./card-header"
import {
  SourceErrorState,
  SourceLoginState,
  SourcePermissionState,
  SourceStatusMessage,
  SourceStatusPattern,
  SourceWorkerTakeoverState,
} from "./card-source-state"
import { LiveCardSurface } from "./card-surface"
import { LiveCardIdentityContext } from "./live-card-identity-context"
import { Ranking } from "./ranking"
import { SourcePermissionDetails } from "./source-permission-details"
import { Timeline } from "./timeline"
import { UnorderedList } from "./unordered-list"

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
  loadedAt: number
  onRefresh: () => void
  onRequestPermission: () => Promise<boolean>
  onFlip?: () => void
  actions?: ReactNode
  dragHandleRef?: LiveCardDragHandleRef
}

function LiveCardRefreshButton({
  isFetching,
  onRefresh,
}: {
  isFetching: boolean
  onRefresh: () => void
}) {
  const { t } = useI18n()
  return (
    <LiveCardHeaderActionButton
      className={isFetching ? "animate-spin" : undefined}
      onClick={onRefresh}
      aria-label={t("refresh")}
    >
      {isFetching ? <PhCircleDashedDuotone /> : <PhArrowCounterClockwiseDuotone />}
    </LiveCardHeaderActionButton>
  )
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

  const presentation = getNewsItemsPresentation(items, presentationType)
  if (presentation.type === "ranking") {
    return (
      <Ranking
        items={items}
        inlinePresentation={inlinePresentation}
        markScale={markScale}
        scrollElement={scrollElement}
      />
    )
  }

  if (presentation.type === "list") {
    return (
      <UnorderedList
        items={items}
        inlinePresentation={inlinePresentation}
        markScale={markScale}
        scrollElement={scrollElement}
      />
    )
  }

  return (
    <Timeline
      items={items}
      inlinePresentation={inlinePresentation}
      markScale={markScale}
      scrollElement={scrollElement}
      times={presentation.times}
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
  loadedAt,
  onRefresh,
  onRequestPermission,
  onFlip,
  actions,
  dragHandleRef,
}: LiveCardFrontProps) {
  const { t } = useI18n()
  const { provider } = source
  const { badge, desc, home, title } = source.metadata
  const icon = useSourceIcon(source)
  const identity = useMemo(() => ({
    badge,
    icon,
    name: title || provider.title,
  }), [badge, icon, provider.title, title])
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
    <div className="relative h-full">
      <LiveCardSurface />
      <div className="relative flex h-full flex-col p-2.5">
        <LiveCardHeader
          badge={badge}
          desc={desc}
          home={home}
          icon={icon}
          provider={provider}
          title={title}
          subtitle={isFetching ? t("updating") : <RelativeTime date={loadedAt} />}
          dragHandleRef={dragHandleRef}
          actions={actions ?? (
            <>
              <LiveCardRefreshButton isFetching={isFetching} onRefresh={onRefresh} />
              {onFlip && (
                <LiveCardHeaderActionButton
                  onClick={onFlip}
                  aria-label={t("showLiveCardDetails")}
                >
                  <PhInfoDuotone />
                </LiveCardHeaderActionButton>
              )}
            </>
          )}
        />

        {/* Content */}
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl">
          <SquircleBox
            aria-hidden
            radius="2xl"
            className={cn(
              "pointer-events-none absolute inset-0 bg-background/70 zenith-theme-400",
              isContentFetching && "animate-pulse",
            )}
          />
          {sourceStatusMessage && (
            <SourceStatusPattern icon={icon} />
          )}
          <div
            ref={setScrollElement}
            onPointerDown={event => event.stopPropagation()}
            className="relative size-full overflow-y-auto px-2 py-2 scrollbar-hidden"
          >
            <div className={cn("min-h-full transition-opacity duration-500", isContentFetching && "opacity-20")}>
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
            </div>
          </div>
          {sourceStatusMessage && (
            <SourceStatusMessage
              message={sourceStatusMessage}
            />
          )}
        </div>
      </div>
    </div>
  )
}
