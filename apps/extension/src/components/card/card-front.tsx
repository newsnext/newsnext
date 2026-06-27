import type { ReactNode } from "react"
import type { BoardSource, NewsItem } from "@/typings/source"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { useMutation } from "@tanstack/react-query"
import { useAtomValue, useSetAtom } from "jotai"
import { memo, useCallback, useMemo, useRef } from "react"
import { useRelativeTime } from "@/hooks/useRelativeTime"
import { orpc } from "@/lib/orpc"
import { cn } from "@/lib/utils"
import { instanceStarredAtom, starInstanceAtom } from "@/store/board"
import { IconButton } from "../common/button"
import {
  PhArrowCounterClockwiseDuotone,
  PhCircleDashedDuotone,
  PhInfoDuotone,
  PhPictureInPictureDuotone,
  PhStarDuotone,
  PhStarFill,
} from "../icons/ph"
import { CardHeader } from "./card-header"
import { Hottest } from "./hottest"
import { Timeline } from "./timeline"

interface CardFrontProps {
  id: string
  source: BoardSource
  items: NewsItem[]
  isFetching: boolean
  sourceErrorMessage?: string
  updatedTime: number
  onRefresh: () => void
  onFlip?: () => void
  onOpenPictureInPicture?: () => void
  isPictureInPictureOpen?: boolean
  isPictureInPictureSupported?: boolean
  actionsVariant?: "default" | "refresh-only"
  dragHandle?: ReactNode
  previewSelection?: {
    selectedItemUrl?: string
    onSelectItem: (item: NewsItem) => void
  }
}

function StarButton({ id, source }: { id: string, source: BoardSource }) {
  const isStarredAtom = useMemo(() => instanceStarredAtom(id), [id])
  const isStarred = useAtomValue(isStarredAtom)
  const starLocal = useSetAtom(starInstanceAtom)
  const setStarredSourceInstance = useMutation(orpc.setStarredSourceInstance.mutationOptions({ onError: () => {} }))

  const handleToggleStar = useCallback(() => {
    const nextIsStarred = !isStarred
    starLocal({ instanceId: id, starred: nextIsStarred })
    if (!source.isLocalOnly) {
      setStarredSourceInstance.mutate({ instanceId: id, starred: nextIsStarred })
    }
  }, [id, isStarred, source.isLocalOnly, starLocal, setStarredSourceInstance])

  return (
    <IconButton
      onClick={handleToggleStar}
      aria-label="Star"
    >
      {isStarred ? <PhStarFill /> : <PhStarDuotone />}
    </IconButton>
  )
}

function CardFrontComponent({
  id,
  source,
  items,
  isFetching,
  sourceErrorMessage,
  updatedTime,
  onRefresh,
  onFlip,
  onOpenPictureInPicture,
  isPictureInPictureOpen = false,
  isPictureInPictureSupported = false,
  actionsVariant = "default",
  dragHandle,
  previewSelection,
}: CardFrontProps) {
  const { type, color, desc, icon, providerTitle, title, home } = source
  const ref = useRef<HTMLDivElement>(null)
  const relativeTime = useRelativeTime({ date: updatedTime })

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
          actions={(
            <>
              <IconButton
                className={cn(
                  isFetching && "animate-spin",
                )}
                onClick={onRefresh}
                aria-label="Refresh"
              >
                {isFetching ? <PhCircleDashedDuotone /> : <PhArrowCounterClockwiseDuotone />}
              </IconButton>
              {actionsVariant === "default" && (
                <>
                  <StarButton id={id} source={source} />
                  {onOpenPictureInPicture && (
                    <IconButton
                      onClick={onOpenPictureInPicture}
                      aria-label={isPictureInPictureOpen ? "Focus picture in picture" : "Open picture in picture"}
                      title={isPictureInPictureSupported ? "Open picture in picture" : "Picture in picture is not supported"}
                      disabled={!isPictureInPictureSupported}
                      className={cn(isPictureInPictureOpen && "opacity-85")}
                    >
                      <PhPictureInPictureDuotone />
                    </IconButton>
                  )}
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
            </>
          )}
        />

        {/* Content */}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <SquircleBox
            aria-hidden
            radius="2xl"
            className={cn(
              "pointer-events-none absolute inset-0 bg-background/70",
              `sprinkle-${color}-400`,
              isFetching && "animate-pulse",
            )}
          />
          <div
            ref={ref}
            onPointerDown={event => event.stopPropagation()}
            className="relative size-full overflow-y-auto px-2 py-2 scrollbar-hidden"
          >
            <div className={cn("transition-opacity-500", isFetching && "opacity-20")}>
              {sourceErrorMessage
                ? (
                    <div className="flex min-h-32 items-center justify-center px-3 text-center text-sm text-muted-foreground">
                      {sourceErrorMessage}
                    </div>
                  )
                : items.length === 0 && !isFetching
                  ? (
                      <div className="flex min-h-32 items-center justify-center px-3 text-center text-sm text-muted-foreground">
                        No source items.
                      </div>
                    )
                  : type === "hottest"
                    ? (
                        <Hottest
                          items={items}
                          color={color}
                          scrollRef={ref as React.RefObject<HTMLDivElement>}
                          previewSelection={previewSelection}
                        />
                      )
                    : (
                        <Timeline
                          color={color}
                          items={items}
                          relativeUpdatedTime={relativeTime}
                          scrollRef={ref as React.RefObject<HTMLDivElement>}
                          previewSelection={previewSelection}
                        />
                      )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const CardFront = memo(CardFrontComponent)
