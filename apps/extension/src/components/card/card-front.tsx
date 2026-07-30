import type { ReactNode } from "react"
import type { BoardSource, NewsItem } from "@/typings/source"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { memo, useRef } from "react"
import { useSourceIcon } from "@/hooks/use-source-icon"
import { useRelativeTime } from "@/hooks/useRelativeTime"
import { cn } from "@/lib/utils"
import { IconButton } from "../common/button"
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
import { Hottest } from "./hottest"
import { Timeline } from "./timeline"

interface CardFrontProps {
  badge?: string
  source: BoardSource
  items: NewsItem[]
  isFetching: boolean
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

export function CardRefreshButton({
  isFetching,
  onRefresh,
}: {
  isFetching: boolean
  onRefresh: () => void
}) {
  return (
    <IconButton
      className={cn(
        isFetching && "animate-spin",
      )}
      onClick={onRefresh}
      aria-label="Refresh"
    >
      {isFetching ? <PhCircleDashedDuotone /> : <PhArrowCounterClockwiseDuotone />}
    </IconButton>
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
  type: BoardSource["type"]
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
  type,
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

  if (type === "hottest") {
    return (
      <Hottest
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
  badge: displayBadge,
  source,
  items,
  isFetching,
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
  const { type, desc, provider, title, home } = source
  const { color } = provider
  const icon = useSourceIcon(source)
  const ref = useRef<HTMLDivElement>(null)
  const relativeTime = useRelativeTime({ date: updatedAt })
  const visibleSourceErrorMessage = isFetching ? undefined : sourceErrorMessage
  const sourceStatusMessage = sourcePermissionRequired
    ? sourcePermissionDescription
    : sourceLoginUrl
      ? `Log in to ${provider.title} to continue.`
      : visibleSourceErrorMessage

  return (
    <div className="relative h-full">
      <SquircleBox
        aria-hidden
        radius="3xl"
        className={cn(
          "pointer-events-none absolute inset-0",
          `bg-${color}-400/40`,
        )}
      />
      <div className="relative flex h-full flex-col p-3">
        <CardHeader
          badge={displayBadge}
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
                <IconButton
                  onClick={onFlip}
                  aria-label="Datail"
                >
                  <PhInfoDuotone />
                </IconButton>
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
              isFetching && "animate-pulse",
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
            <div className={cn("min-h-full transition-opacity-500", isFetching && "opacity-20")}>
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
                type={type}
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
