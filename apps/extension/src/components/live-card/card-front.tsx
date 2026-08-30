import type { SourceItemPresentation } from "@newsnext/source-kit/types"
import type { ReactNode } from "react"
import type { LiveCardDragHandleRef } from "./card-header"
import type { SourcePermissionRequest } from "@/lib/source"
import type { LiveCardViewModel, NewsItem } from "@/typings/source"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { useMemo, useState } from "react"
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
} from "./card-source-state"
import { LiveCardSurface } from "./card-surface"
import { Ranking } from "./ranking"
import { SourcePermissionDetails } from "./source-permission-details"
import { Timeline } from "./timeline"
import { UnorderedList } from "./unordered-list"

interface LiveCardFrontProps {
  source: LiveCardViewModel
  items: NewsItem[]
  itemPresentation?: SourceItemPresentation[]
  isFetching: boolean
  isContentFetching: boolean
  sourceErrorMessage?: string
  sourceLoginUrl?: string
  sourcePermissionRequest?: SourcePermissionRequest
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
  return (
    <LiveCardHeaderActionButton
      className={isFetching ? "animate-spin" : undefined}
      onClick={onRefresh}
      aria-label="Refresh"
    >
      {isFetching ? <PhCircleDashedDuotone /> : <PhArrowCounterClockwiseDuotone />}
    </LiveCardHeaderActionButton>
  )
}

interface LiveCardFrontContentProps {
  icon?: string
  items: NewsItem[]
  itemPresentation?: SourceItemPresentation[]
  markScale?: number
  provider: LiveCardViewModel["provider"]
  presentationType?: LiveCardViewModel["metadata"]["type"]
  scrollElement: HTMLDivElement | null
  sourceErrorMessage?: string
  sourceLoginUrl?: string
  sourcePermissionRequest?: SourcePermissionRequest
  onRefresh: () => void
  onRequestPermission: () => Promise<boolean>
}

function LiveCardFrontContent({
  icon,
  items,
  itemPresentation,
  markScale,
  provider,
  presentationType,
  scrollElement,
  sourceErrorMessage,
  sourceLoginUrl,
  sourcePermissionRequest,
  onRefresh,
  onRequestPermission,
}: LiveCardFrontContentProps) {
  if (sourcePermissionRequest) {
    return (
      <SourcePermissionState
        icon={icon}
        onRequestPermission={onRequestPermission}
        provider={provider}
      />
    )
  }

  if (sourceLoginUrl) {
    return (
      <SourceLoginState
        icon={icon}
        provider={provider}
        loginUrl={sourceLoginUrl}
      />
    )
  }

  if (sourceErrorMessage) {
    return (
      <SourceErrorState
        icon={icon}
        onRefresh={onRefresh}
        provider={provider}
      />
    )
  }

  const presentation = getNewsItemsPresentation(items, presentationType)
  if (presentation.type === "ranking") {
    return (
      <Ranking
        items={items}
        itemPresentation={itemPresentation}
        markScale={markScale}
        scrollElement={scrollElement}
      />
    )
  }

  if (presentation.type === "list") {
    return (
      <UnorderedList
        items={items}
        itemPresentation={itemPresentation}
        markScale={markScale}
        scrollElement={scrollElement}
      />
    )
  }

  return (
    <Timeline
      items={items}
      itemPresentation={itemPresentation}
      markScale={markScale}
      scrollElement={scrollElement}
      times={presentation.times}
    />
  )
}

export function LiveCardFront({
  source,
  items,
  itemPresentation,
  isFetching,
  isContentFetching,
  sourceErrorMessage,
  sourceLoginUrl,
  sourcePermissionRequest,
  loadedAt,
  onRefresh,
  onRequestPermission,
  onFlip,
  actions,
  dragHandleRef,
}: LiveCardFrontProps) {
  const { provider } = source
  const { badge, desc, home, title } = source.metadata
  const icon = useSourceIcon(source)
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null)
  const markScaleGroups = useMemo(
    () => [{ items, sourceKey: source.id }],
    [items, source.id],
  )
  const markScale = useSourceMarkScales(markScaleGroups).get(source.id)
  const visibleSourceErrorMessage = isContentFetching ? undefined : sourceErrorMessage
  const sourceStatusMessage = sourcePermissionRequest
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
      ? `Log in to ${provider.title} to continue.`
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
          subtitle={isFetching ? "Updating..." : <RelativeTime date={loadedAt} />}
          dragHandleRef={dragHandleRef}
          actions={actions ?? (
            <>
              <LiveCardRefreshButton isFetching={isFetching} onRefresh={onRefresh} />
              {onFlip && (
                <LiveCardHeaderActionButton
                  onClick={onFlip}
                  aria-label="Show LiveCard details"
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
              <LiveCardFrontContent
                icon={icon}
                items={items}
                itemPresentation={itemPresentation}
                markScale={markScale}
                provider={provider}
                presentationType={source.metadata.type}
                scrollElement={scrollElement}
                sourceErrorMessage={visibleSourceErrorMessage}
                sourceLoginUrl={sourceLoginUrl}
                sourcePermissionRequest={sourcePermissionRequest}
                onRefresh={onRefresh}
                onRequestPermission={onRequestPermission}
              />
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
