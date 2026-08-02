import type { ReactNode } from "react"
import type { BoardSource, NewsItem } from "@/typings/source"
import { Button } from "@newsnext/ui/components/button"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { memo, useRef } from "react"
import { useSourceIcon } from "@/hooks/use-source-icon"
import { useRelativeTime } from "@/hooks/useRelativeTime"
import { isTimelineItems } from "@/lib/source-presentation"
import { cn } from "@/lib/utils"
import {
  PhArrowCounterClockwiseDuotone,
  PhCircleDashedDuotone,
  PhInfoDuotone,
} from "../icons/ph"
import { CardHeader } from "./card-header"
import {
  SourceErrorState,
  SourceLoginState,
  SourcePermissionState,
  SourceStatusMessage,
  SourceStatusPattern,
} from "./card-source-state"
import { CardSurface } from "./card-surface"
import { Ranking } from "./ranking"
import { Timeline } from "./timeline"

interface CardFrontProps {
  source: BoardSource
  items: NewsItem[]
  isFetching: boolean
  isFetchingLatest: boolean
  sourceErrorMessage?: string
  sourceLoginUrl?: string
  sourcePermissionDescription: string
  sourcePermissionRequired: boolean
  updatedAt: number
  onRefresh: () => void
  onRequestPermission: () => Promise<boolean>
  onFlip?: () => void
  actions?: ReactNode
  dragHandle?: ReactNode
}

function CardRefreshButton({
  isFetching,
  onRefresh,
}: {
  isFetching: boolean
  onRefresh: () => void
}) {
  return (
    <Button
      variant="quiet"
      size="icon-fit"
      className={cn(
        isFetching && "animate-spin",
      )}
      onClick={onRefresh}
      aria-label="Refresh"
    >
      {isFetching ? <PhCircleDashedDuotone /> : <PhArrowCounterClockwiseDuotone />}
    </Button>
  )
}

interface CardFrontContentProps {
  color: BoardSource["provider"]["color"]
  icon?: string
  items: NewsItem[]
  provider: BoardSource["provider"]
  relativeUpdatedAt: string
  scrollRef: React.RefObject<HTMLDivElement>
  sourceErrorMessage?: string
  sourceLoginUrl?: string
  sourcePermissionRequired: boolean
  onRefresh: () => void
  onRequestPermission: () => Promise<boolean>
}

function CardFrontContent({
  color,
  icon,
  items,
  provider,
  relativeUpdatedAt,
  scrollRef,
  sourceErrorMessage,
  sourceLoginUrl,
  sourcePermissionRequired,
  onRefresh,
  onRequestPermission,
}: CardFrontContentProps) {
  if (sourcePermissionRequired) {
    return (
      <SourcePermissionState
        color={color}
        icon={icon}
        onRequestPermission={onRequestPermission}
        provider={provider}
      />
    )
  }

  if (sourceLoginUrl) {
    return (
      <SourceLoginState
        color={color}
        icon={icon}
        provider={provider}
        loginUrl={sourceLoginUrl}
      />
    )
  }

  if (sourceErrorMessage) {
    return (
      <SourceErrorState
        color={color}
        icon={icon}
        onRefresh={onRefresh}
        provider={provider}
      />
    )
  }

  if (!isTimelineItems(items)) {
    return (
      <Ranking
        items={items}
        color={color}
        scrollRef={scrollRef}
      />
    )
  }

  return (
    <Timeline
      color={color}
      items={items}
      relativeUpdatedAt={relativeUpdatedAt}
      scrollRef={scrollRef}
    />
  )
}

function CardFrontComponent({
  source,
  items,
  isFetching,
  isFetchingLatest,
  sourceErrorMessage,
  sourceLoginUrl,
  sourcePermissionDescription,
  sourcePermissionRequired,
  updatedAt,
  onRefresh,
  onRequestPermission,
  onFlip,
  actions,
  dragHandle,
}: CardFrontProps) {
  const { provider } = source
  const { badge, desc, home, title } = source.metadata
  const { color } = provider
  const icon = useSourceIcon(source)
  const ref = useRef<HTMLDivElement>(null)
  const relativeTime = useRelativeTime({ date: updatedAt })
  const visibleSourceErrorMessage = isFetchingLatest ? undefined : sourceErrorMessage
  const sourceStatusMessage = sourcePermissionRequired
    ? sourcePermissionDescription
    : sourceLoginUrl
      ? `Log in to ${provider.title} to continue.`
      : visibleSourceErrorMessage

  return (
    <div className="relative h-full">
      <CardSurface color={color} />
      <div className="relative flex h-full flex-col p-2.5">
        <CardHeader
          badge={badge}
          color={color}
          desc={desc}
          home={home}
          icon={icon}
          provider={provider}
          title={title}
          subtitle={isFetching ? "Updating..." : relativeTime}
          actions={actions ?? (
            <>
              <CardRefreshButton isFetching={isFetching} onRefresh={onRefresh} />
              {onFlip && (
                <Button
                  variant="quiet"
                  size="icon-fit"
                  onClick={onFlip}
                  aria-label="Detail"
                >
                  <PhInfoDuotone />
                </Button>
              )}
              {dragHandle}
            </>
          )}
        />

        {/* Content */}
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl">
          <SquircleBox
            aria-hidden
            radius="2xl"
            className={cn(
              "pointer-events-none absolute inset-0 bg-background/70",
              `sunrise-${color}-400`,
              isFetchingLatest && "animate-pulse",
            )}
          />
          {sourceStatusMessage && (
            <SourceStatusPattern icon={icon} />
          )}
          <div
            ref={ref}
            onPointerDown={event => event.stopPropagation()}
            className="relative size-full overflow-y-auto px-2 py-2 scrollbar-hidden"
          >
            <div className={cn("min-h-full transition-opacity-500", isFetchingLatest && "opacity-20")}>
              <CardFrontContent
                color={color}
                icon={icon}
                items={items}
                provider={provider}
                relativeUpdatedAt={relativeTime}
                scrollRef={ref as React.RefObject<HTMLDivElement>}
                sourceErrorMessage={visibleSourceErrorMessage}
                sourceLoginUrl={sourceLoginUrl}
                sourcePermissionRequired={sourcePermissionRequired}
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

export const CardFront = memo(CardFrontComponent)
