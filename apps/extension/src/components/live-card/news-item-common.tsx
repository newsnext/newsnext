import type { ReactNode } from "react"
import type { RankingHistoryData, RankingHistorySource } from "@/lib/background/ranking-history"
import type { NewsItem } from "@/typings/source"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@newsnext/ui/components/popover"
import { overlayScrollbarsRef } from "@newsnext/ui/hooks/use-overlay-scrollbars"
import { cn } from "@newsnext/ui/lib/utils"
import { useEffect, useState } from "react"
import { RelativeTime } from "@/hooks/useRelativeTime"
import { createBackgroundClient } from "@/lib/background"
import { NewsItemInline, SemanticImage } from "./news-item-inline"
import { NewsItemPreview, NewsItemPreviewDialog } from "./news-item-preview"

interface NewsItemLinkProps {
  item: NewsItem
  className?: string
  children: ReactNode
  inlineText?: string
  inlineSuffix?: ReactNode
  markScale?: number
  previewItems?: NewsItem[]
  previewIndex?: number
  previewInlinePresentation?: string[]
  showPreviewTime?: boolean
  rankingHistory?: RankingHistorySource
}

export function NewsItemLink({
  item,
  className,
  children,
  inlineText,
  inlineSuffix,
  markScale,
  previewItems,
  previewIndex = 0,
  previewInlinePresentation,
  showPreviewTime = false,
  rankingHistory,
}: NewsItemLinkProps): ReactNode {
  const [pictureIndex, setPictureIndex] = useState(0)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [activePreviewIndex, setActivePreviewIndex] = useState(previewIndex)
  const activeItem = previewItems?.[activePreviewIndex] ?? item
  const activeInlineText = previewInlinePresentation?.[activePreviewIndex]
    ?? (activePreviewIndex === previewIndex ? inlineText : undefined)
  const activeTime = showPreviewTime ? activeItem.publishedAt : undefined
  const activeInlineSuffix = activeTime === undefined
    ? (activePreviewIndex === previewIndex ? inlineSuffix : undefined)
    : <RelativeTime date={activeTime} />
  const canNavigateItems = previewItems !== undefined && previewItems.length > 1
  const [history, setHistory] = useState<RankingHistoryData & { url: string }>()
  const historyUrl = previewDialogOpen ? activeItem.url : popoverOpen ? item.url : undefined
  const historyCardId = rankingHistory?.cardId
  const historyVersion = rankingHistory?.sourceVersion
  const historyParams = rankingHistory?.params

  useEffect(() => {
    if (!historyUrl || !historyCardId || historyVersion === undefined || !historyParams) return
    let cancelled = false
    void createBackgroundClient().rankingHistory({
      cardId: historyCardId,
      sourceVersion: historyVersion,
      params: historyParams,
      url: historyUrl,
    }).then((result) => {
      if (!cancelled) setHistory({ url: historyUrl, positions: result, queriedAt: Date.now() })
    }).catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [historyUrl, historyCardId, historyVersion, historyParams])

  const openPreviewDialog = (): void => {
    setActivePreviewIndex(previewIndex)
    // Same reset as item navigation: never inherit another item's carousel position.
    setPictureIndex(0)
    setPopoverOpen(false)
    setPreviewDialogOpen(true)
  }

  const navigateToItem = (index: number): void => {
    // Carousel position belongs to the previous item; carryover would show the wrong picture.
    setActivePreviewIndex(index)
    setPictureIndex(0)
  }

  return (
    <>
      <Popover
        open={popoverOpen}
        onOpenChange={(open, eventDetails) => {
          // The whole row is already a link, so a press would both preview and navigate.
          if (eventDetails.reason === "trigger-press") {
            eventDetails.cancel()
            return
          }
          if (open) setHistory(undefined)
          setPopoverOpen(open)
        }}
      >
        <a
          data-news-item
          href={item.url}
          target="_blank"
          rel="noreferrer"
          // Rows stay non-selectable so drag/click gestures win; previews re-enable selection.
          className={cn("relative select-none visited:text-neutral-500 dark:visited:text-neutral-400", className)}
        >
          {children}
          {/* Left-half hover trigger (300ms intent) so the pointer can reach the left-anchored preview without crossing a competing trigger. */}
          <PopoverTrigger
            nativeButton={false}
            openOnHover
            delay={300}
            closeDelay={100}
            render={props => (
              <span
                {...props}
                aria-hidden="true"
                role="presentation"
                tabIndex={-1}
                className="absolute inset-y-0 left-0 w-1/2"
              />
            )}
          />
        </a>
        <PopoverContent
          side="left"
          align="start"
          alignOffset={0}
          ref={overlayScrollbarsRef}
          className="max-h-96 gap-2 overflow-y-auto"
          initialFocus={false}
          finalFocus={false}
        >
          <NewsItemPreview
            item={item}
            rankingHistory={history?.url === item.url ? history : undefined}
            currentPosition={previewIndex + 1}
            pictureIndex={pictureIndex}
            onPictureIndexChange={setPictureIndex}
            onOpen={openPreviewDialog}
          />
        </PopoverContent>
      </Popover>
      <NewsItemPreviewDialog
        item={activeItem}
        rankingHistory={history?.url === activeItem.url ? history : undefined}
        currentPosition={activePreviewIndex + 1}
        open={previewDialogOpen}
        index={pictureIndex}
        onIndexChange={setPictureIndex}
        onClose={() => setPreviewDialogOpen(false)}
        inlineText={activeInlineText}
        inlineSuffix={activeInlineSuffix}
        markScale={markScale}
        onPreviousItem={canNavigateItems && activePreviewIndex > 0
          ? () => navigateToItem(activePreviewIndex - 1)
          : undefined}
        onNextItem={canNavigateItems && activePreviewIndex < previewItems.length - 1
          ? () => navigateToItem(activePreviewIndex + 1)
          : undefined}
      />
    </>
  )
}

interface NewsItemSummaryProps {
  item: NewsItem
  inlineText?: string
  className?: string
  inlineSuffix?: ReactNode
  markScale?: number
}

export function NewsItemSummary({ item, inlineText, className, inlineSuffix, markScale }: NewsItemSummaryProps) {
  return (
    <span className={cn("leading-none line-clamp-3", className)}>
      {item.icon && (
        <SemanticImage
          picture={item.icon}
          className="mr-1 rounded"
        />
      )}
      <span className="mr-1 text-base align-middle">
        {item.title}
      </span>
      <NewsItemInline
        item={item}
        inlineText={inlineText}
        inlineSuffix={inlineSuffix}
        markScale={markScale}
      />
    </span>
  )
}
