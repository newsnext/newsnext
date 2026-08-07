import type { RefObject } from "react"
import type { BoardSource } from "@/typings/source"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useAtomValue } from "jotai"
import { m } from "motion/react"
import { useCallback, useEffect, useId, useMemo, useState } from "react"
import { useBoardItems } from "@/components/board-items-context"
import { useBoardSourceCards } from "@/hooks/use-board-source-cards"
import { formatRelativeTime, minuteDateAtom } from "@/hooks/useRelativeTime"
import { mixSourceItems } from "@/lib/board"
import { resolveSourceIcon } from "@/lib/source"
import { cn } from "@/lib/utils"
import { sourceIconSettingsAtom } from "@/store/settings"
import { NewsItemLink, NewsItemSummary } from "../card/news-item-common"
import { SourceIcon } from "../card/source-icon"
import { TimelineRail } from "../card/timeline-rail"

interface NextLayerProps {
  boardId: string
  isVisible: boolean
  onClose: () => void
  scrollContainerRef?: RefObject<HTMLDivElement | null>
}

interface NextLayerSource {
  card: BoardSource
  icon?: string
  id: string
}

type MixedItem = ReturnType<typeof mixSourceItems<NextLayerSource>>[number]

function MixedItemRow({
  entry,
  gradientId,
  index,
  isLast,
  showTimeLabel,
  timeLabel,
}: {
  entry: MixedItem
  gradientId: string
  index: number
  isLast: boolean
  showTimeLabel: boolean
  timeLabel: string
}) {
  const { item, source: result } = entry
  const { badge, title } = result.card.metadata
  const displayTitle = title || result.card.provider.title

  return (
    <div className={cn("relative min-w-0 pb-2", isLast && "pb-0")}>
      <TimelineRail
        gradientId={gradientId}
        index={index}
        showLabel={showTimeLabel}
      />
      <div className="flex min-w-0">
        <div className="w-5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          {showTimeLabel && (
            <div className="-ml-4 mb-2 mt-1">
              <span className="inline-flex rounded-3xl bg-muted p-1 text-xs leading-none text-muted-foreground">
                {timeLabel}
              </span>
            </div>
          )}
          <NewsItemLink
            item={item}
            className="group grid min-w-0 grid-cols-1 items-center gap-2.5 rounded-2xl px-2 py-2 transition-colors hover:bg-background/70 focus-visible:bg-background/70 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-3"
          >
            <span className="flex min-w-0 flex-col gap-1.5">
              <NewsItemSummary
                item={item}
                className="font-medium leading-snug text-foreground group-hover:text-theme-700 dark:group-hover:text-theme-200"
              />
              <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground sm:hidden">
                <SourceIcon
                  badge={badge}
                  icon={result.icon}
                  title={displayTitle}
                />
                <span className="truncate">{displayTitle}</span>
              </span>
            </span>

            <span className="hidden min-w-0 max-w-44 items-center justify-end gap-2 text-xs text-muted-foreground sm:flex">
              <SourceIcon
                badge={badge}
                icon={result.icon}
                title={displayTitle}
              />
              <span className="truncate">{displayTitle}</span>
            </span>
          </NewsItemLink>
        </div>
      </div>
    </div>
  )
}

interface VirtualTimelineProps {
  gradientId: string
  items: MixedItem[]
  scrollElement: HTMLDivElement | null
  timeLabels: string[]
}

function VirtualTimeline({
  gradientId,
  items,
  scrollElement,
  timeLabels,
}: VirtualTimelineProps) {
  const [scrollMargin, setScrollMargin] = useState(0)
  const getItemKey = useCallback((index: number) => {
    const entry = items[index]
    return entry
      ? `${entry.source.id}:${entry.rank}:${entry.item.url}`
      : index
  }, [items])
  // TanStack Virtual returns unstable functions by design, so React Compiler must skip this boundary.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    estimateSize: () => 76,
    getItemKey,
    getScrollElement: () => scrollElement,
    overscan: 5,
    scrollMargin,
  })
  const setListElement = useCallback((node: HTMLOListElement | null) => {
    if (!node || !scrollElement) return

    const listTop = node.getBoundingClientRect().top
      - scrollElement.getBoundingClientRect().top
      + scrollElement.scrollTop
    setScrollMargin(current => current === listTop ? current : listTop)
  }, [scrollElement])

  return (
    <ol
      ref={setListElement}
      className="relative mx-3 my-2 sm:mx-4 sm:my-3"
      style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
    >
      {rowVirtualizer.getVirtualItems().map((virtualItem) => {
        const entry = items[virtualItem.index]
        if (!entry) return null

        const index = virtualItem.index
        return (
          <li
            key={virtualItem.key}
            ref={rowVirtualizer.measureElement}
            data-index={index}
            className={cn(
              "absolute left-0 top-0 w-full",
              entry.source.card.provider.color,
            )}
            style={{
              transform: `translateY(${virtualItem.start - scrollMargin}px)`,
            }}
          >
            <MixedItemRow
              entry={entry}
              gradientId={gradientId}
              index={index}
              isLast={index === items.length - 1}
              showTimeLabel={index === 0 || timeLabels[index] !== timeLabels[index - 1]}
              timeLabel={timeLabels[index] ?? ""}
            />
          </li>
        )
      })}
    </ol>
  )
}

export function NextLayer({
  boardId,
  isVisible,
  onClose,
  scrollContainerRef,
}: NextLayerProps) {
  const gradientId = useId().replace(/:/g, "")
  const now = useAtomValue(minuteDateAtom)
  const iconSettings = useAtomValue(sourceIconSettingsAtom)
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null)
  const sourceResults = useBoardItems()
  const { currentBoard, sourceIds } = useBoardSourceCards(boardId)

  const mixedItems = useMemo(() => mixSourceItems(
    sourceIds.flatMap((id) => {
      const result = sourceResults[id]
      if (!result || result.filter !== currentBoard.filter) return []

      return [{
        items: result.items,
        source: {
          card: result.card,
          id: result.id,
          icon: resolveSourceIcon(
            result.card.provider.icon,
            result.card.metadata.home,
            iconSettings.template,
          ),
        },
        updatedAt: result.updatedAt,
      }]
    }),
  ), [currentBoard.filter, iconSettings.template, sourceIds, sourceResults])
  const timeLabels = useMemo(
    () => mixedItems.map(entry => formatRelativeTime(entry.timestamp, now)),
    [mixedItems, now],
  )
  const isLoading = sourceIds.some((id) => {
    const result = sourceResults[id]
    return !result || result.filter !== currentBoard.filter || result.isLoading
  })

  useEffect(() => {
    if (!isVisible) return

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isVisible, onClose])

  const setScrollContainer = useCallback((node: HTMLDivElement | null) => {
    if (scrollContainerRef) {
      scrollContainerRef.current = node
    }
    setScrollElement(current => current === node ? current : node)
  }, [scrollContainerRef])

  return (
    <div
      ref={setScrollContainer}
      className="h-full w-full overflow-y-auto bg-transparent scrollbar-hidden"
      onClick={onClose}
    >
      {isVisible && (
        <m.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.12, duration: 0.25, ease: "easeOut" }}
          className="mx-auto min-h-full w-full max-w-3xl px-1 pb-24 pt-28 sm:px-6"
          onClick={event => event.stopPropagation()}
        >
          <div className="mx-5 mb-4 flex min-w-0 flex-col sm:mx-6">
            <h1 className="truncate text-base font-bold">
              Timeline
            </h1>
            <p className="truncate text-xs opacity-70">
              {sourceIds.length}
              {" "}
              {sourceIds.length === 1 ? "source" : "sources"}
              <span className="px-1" aria-hidden>·</span>
              {mixedItems.length}
              {" "}
              {mixedItems.length === 1 ? "item" : "items"}
            </p>
          </div>

          {mixedItems.length > 0
            ? (
                <VirtualTimeline
                  gradientId={gradientId}
                  items={mixedItems}
                  scrollElement={scrollElement}
                  timeLabels={timeLabels}
                />
              )
            : (
                <div className="flex min-h-52 items-center justify-center p-8">
                  <p className="text-center text-sm text-muted-foreground">
                    {sourceIds.length > 0 && isLoading
                      ? "Loading items…"
                      : sourceIds.length > 0
                        ? "No items to show."
                        : "Add a card to see its items here."}
                  </p>
                </div>
              )}
        </m.main>
      )}
    </div>
  )
}
