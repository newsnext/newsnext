import type { ReactNode } from "react"
import type { BoardSource, NewsItem } from "@/typings/source"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { useAtomValue, useSetAtom } from "jotai"
import { memo, useCallback, useMemo, useRef } from "react"
import { useRelativeTime } from "@/hooks/useRelativeTime"
import { cn } from "@/lib/utils"
import { instanceStarredAtom, starInstanceAtom } from "@/store/board"
import { IconButton } from "../common/button"
import {
  PhArrowCounterClockwiseDuotone,
  PhCircleDashedDuotone,
  PhInfoDuotone,
  PhStarDuotone,
  PhStarFill,
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
  id: string
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
  showStar?: boolean
  actions?: ReactNode
  dragHandle?: ReactNode
}

function StarButton({ id }: { id: string }) {
  const isStarredAtom = useMemo(() => instanceStarredAtom(id), [id])
  const isStarred = useAtomValue(isStarredAtom)
  const starLocal = useSetAtom(starInstanceAtom)

  const handleToggleStar = useCallback(() => {
    starLocal({ instanceId: id, starred: !isStarred })
  }, [id, isStarred, starLocal])

  return (
    <IconButton
      onClick={handleToggleStar}
      aria-label="Star"
    >
      {isStarred ? <PhStarFill /> : <PhStarDuotone />}
    </IconButton>
  )
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
  color: BoardSource["color"]
  icon?: string
  isFetching: boolean
  items: NewsItem[]
  providerTitle: string
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
  providerTitle,
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
        providerTitle={providerTitle}
      />
    )
  }

  if (sourceLoginUrl) {
    return (
      <SourceLoginState
        color={color}
        icon={icon}
        providerTitle={providerTitle}
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
        providerTitle={providerTitle}
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
  id,
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
  showStar = true,
  actions,
  dragHandle,
}: CardFrontProps) {
  const { type, color, desc, icon, providerTitle, title, home } = source
  const ref = useRef<HTMLDivElement>(null)
  const relativeTime = useRelativeTime({ date: updatedAt })
  const sourceStatusMessage = sourcePermissionRequired
    ? sourcePermissionDescription
    : sourceLoginUrl
      ? `Log in to ${providerTitle} to continue.`
      : sourceErrorMessage

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
          color={color}
          desc={desc}
          home={home}
          icon={icon}
          providerTitle={providerTitle}
          title={title}
          subtitle={isFetching ? "Updating..." : relativeTime}
          actions={actions ?? (
            <>
              <CardRefreshButton isFetching={isFetching} onRefresh={onRefresh} />
              {showStar && <StarButton id={id} />}
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
                isFetching={isFetching}
                items={items}
                providerTitle={providerTitle}
                relativeUpdatedAt={relativeTime}
                scrollRef={ref as React.RefObject<HTMLDivElement>}
                sourceErrorMessage={sourceErrorMessage}
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
