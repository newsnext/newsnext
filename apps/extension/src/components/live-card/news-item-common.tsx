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
import { useEffect, useRef, useState } from "react"
import { RelativeTime } from "@/hooks/useRelativeTime"
import { createBackgroundClient } from "@/lib/background"
import { animateNewsItemReturn } from "./news-item-animation"
import { NewsItemAnnotation, SemanticImage } from "./news-item-annotation"
import { NewsItemPreview, NewsItemPreviewDialog } from "./news-item-preview"

interface NewsItemLinkProps {
  item: NewsItem
  className?: string
  children: ReactNode
  annotation?: string
  annotationSuffix?: ReactNode
  markScale?: number
  previewItems?: NewsItem[]
  previewIndex?: number
  previewAnnotations?: string[]
  showPreviewTime?: boolean
  rankingHistory?: RankingHistorySource
}

export function NewsItemLink({
  item,
  className,
  children,
  annotation,
  annotationSuffix,
  markScale,
  previewItems,
  previewIndex = 0,
  previewAnnotations,
  showPreviewTime = false,
  rankingHistory,
}: NewsItemLinkProps): ReactNode {
  const [pictureIndex, setPictureIndex] = useState(0)
  const itemLinkRef = useRef<HTMLAnchorElement>(null)
  const entranceAnimationsRef = useRef<Animation[]>([])
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [activePreviewIndex, setActivePreviewIndex] = useState(previewIndex)
  const activeItem = previewItems?.[activePreviewIndex] ?? item
  const activeAnnotation = previewAnnotations?.[activePreviewIndex]
    ?? (activePreviewIndex === previewIndex ? annotation : undefined)
  const activeTime = showPreviewTime ? activeItem.publishedAt : undefined
  const activeAnnotationSuffix = activeTime === undefined
    ? (activePreviewIndex === previewIndex ? annotationSuffix : undefined)
    : <RelativeTime date={activeTime} />
  const canNavigateItems = previewItems !== undefined && previewItems.length > 1
  const [history, setHistory] = useState<RankingHistoryData & { url: string }>()
  const historyUrl = previewDialogOpen ? activeItem.url : popoverOpen ? item.url : undefined
  const historyCardId = rankingHistory?.cardId
  const historyVersion = rankingHistory?.sourceVersion
  const historyParams = rankingHistory?.params

  useEffect(() => () => entranceAnimationsRef.current.forEach(animation => animation.cancel()), [])

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
    entranceAnimationsRef.current.forEach(animation => animation.cancel())
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
          ref={itemLinkRef}
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
        onClose={(origin) => {
          setPreviewDialogOpen(false)
          entranceAnimationsRef.current.forEach(animation => animation.cancel())
          entranceAnimationsRef.current = []
          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
          const link = activeItem.url === item.url
            ? itemLinkRef.current
            : itemLinkRef.current?.closest("[data-live-card-id]")
                ?.querySelector<HTMLAnchorElement>(`a[data-news-item][href="${CSS.escape(activeItem.url)}"]`)
          const content = link?.querySelector<HTMLElement>("[data-news-item-content]")
          if (content && origin) entranceAnimationsRef.current = animateNewsItemReturn(content, origin)
        }}
        annotation={activeAnnotation}
        annotationSuffix={activeAnnotationSuffix}
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
  annotation?: string
  className?: string
  annotationSuffix?: ReactNode
  markScale?: number
}

export function NewsItemSummary({ item, annotation, className, annotationSuffix, markScale }: NewsItemSummaryProps) {
  return (
    <span data-news-item-content className={cn("leading-none line-clamp-3", className)}>
      {item.icon && (
        <SemanticImage
          picture={item.icon}
          className="mr-1 rounded"
        />
      )}
      <span data-news-item-title className="mr-1 text-base align-middle">
        {item.title}
      </span>
      <NewsItemAnnotation
        item={item}
        annotation={annotation}
        annotationSuffix={annotationSuffix}
        markScale={markScale}
      />
    </span>
  )
}
