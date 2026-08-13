import type { ReactNode } from "react"
import type { CardViewModel, NewsItem } from "@/typings/source"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { useState } from "react"
import { useSourceIcon } from "@/hooks/use-source-icon"
import { RelativeTime } from "@/hooks/useRelativeTime"
import { isTimelineItems } from "@/lib/source"
import { cn } from "@/lib/utils"
import {
  PhArrowCounterClockwiseDuotone,
  PhCircleDashedDuotone,
  PhInfoDuotone,
} from "../icons/ph"
import { CardHeader, CardHeaderActionButton } from "./card-header"
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
  source: CardViewModel
  items: NewsItem[]
  isFetching: boolean
  isContentFetching: boolean
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
    <CardHeaderActionButton
      className={isFetching ? "animate-spin" : undefined}
      onClick={onRefresh}
      aria-label="Refresh"
    >
      {isFetching ? <PhCircleDashedDuotone /> : <PhArrowCounterClockwiseDuotone />}
    </CardHeaderActionButton>
  )
}

interface CardFrontContentProps {
  icon?: string
  items: NewsItem[]
  provider: CardViewModel["provider"]
  scrollElement: HTMLDivElement | null
  sourceErrorMessage?: string
  sourceLoginUrl?: string
  sourcePermissionRequired: boolean
  updatedAt: number
  onRefresh: () => void
  onRequestPermission: () => Promise<boolean>
}

function CardFrontContent({
  icon,
  items,
  provider,
  scrollElement,
  sourceErrorMessage,
  sourceLoginUrl,
  sourcePermissionRequired,
  updatedAt,
  onRefresh,
  onRequestPermission,
}: CardFrontContentProps) {
  if (sourcePermissionRequired) {
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

  if (!isTimelineItems(items)) {
    return (
      <Ranking
        items={items}
        scrollElement={scrollElement}
      />
    )
  }

  return (
    <Timeline
      items={items}
      updatedAt={updatedAt}
      scrollElement={scrollElement}
    />
  )
}

export function CardFront({
  source,
  items,
  isFetching,
  isContentFetching,
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
  const icon = useSourceIcon(source)
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null)
  const visibleSourceErrorMessage = isContentFetching ? undefined : sourceErrorMessage
  const sourceStatusMessage = sourcePermissionRequired
    ? sourcePermissionDescription
    : sourceLoginUrl
      ? `Log in to ${provider.title} to continue.`
      : visibleSourceErrorMessage

  return (
    <div className="relative h-full">
      <CardSurface />
      <div className="relative flex h-full flex-col p-2.5">
        <CardHeader
          badge={badge}
          desc={desc}
          home={home}
          icon={icon}
          provider={provider}
          title={title}
          subtitle={isFetching ? "Updating..." : <RelativeTime date={updatedAt} />}
          actions={actions ?? (
            <>
              <CardRefreshButton isFetching={isFetching} onRefresh={onRefresh} />
              {onFlip && (
                <CardHeaderActionButton
                  onClick={onFlip}
                  aria-label="Show card details"
                >
                  <PhInfoDuotone />
                </CardHeaderActionButton>
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
              <CardFrontContent
                icon={icon}
                items={items}
                provider={provider}
                scrollElement={scrollElement}
                sourceErrorMessage={visibleSourceErrorMessage}
                sourceLoginUrl={sourceLoginUrl}
                sourcePermissionRequired={sourcePermissionRequired}
                updatedAt={updatedAt}
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
