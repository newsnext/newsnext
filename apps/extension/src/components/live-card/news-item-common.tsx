import type { ReactNode } from "react"
import type { NewsItem } from "@/typings/source"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@newsnext/ui/components/popover"
import { useState } from "react"
import { RelativeTime } from "@/hooks/useRelativeTime"
import { getNewsItemTime } from "@/lib/source"
import { cn } from "@/lib/utils"
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
}: NewsItemLinkProps): ReactNode {
  const [pictureIndex, setPictureIndex] = useState(0)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [activePreviewIndex, setActivePreviewIndex] = useState(previewIndex)
  const activeItem = previewItems?.[activePreviewIndex] ?? item
  const activeInlineText = previewInlinePresentation?.[activePreviewIndex]
    ?? (activePreviewIndex === previewIndex ? inlineText : undefined)
  const activeTime = showPreviewTime ? getNewsItemTime(activeItem) : undefined
  const activeInlineSuffix = activeTime === undefined
    ? (activePreviewIndex === previewIndex ? inlineSuffix : undefined)
    : <RelativeTime date={activeTime} />
  const canNavigateItems = previewItems !== undefined && previewItems.length > 1

  const openPreviewDialog = (): void => {
    setActivePreviewIndex(previewIndex)
    setPictureIndex(0)
    setPopoverOpen(false)
    setPreviewDialogOpen(true)
  }

  const navigateToItem = (index: number): void => {
    setActivePreviewIndex(index)
    setPictureIndex(0)
  }

  return (
    <>
      <Popover
        open={popoverOpen}
        onOpenChange={(open, eventDetails) => {
          if (eventDetails.reason === "trigger-press") {
            eventDetails.cancel()
            return
          }
          setPopoverOpen(open)
        }}
      >
        <a
          data-news-item
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className={cn("relative select-none visited:text-neutral-500 dark:visited:text-neutral-400", className)}
        >
          {children}
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
          className="max-h-96 gap-2 overflow-y-auto scrollbar-hidden"
          initialFocus={false}
          finalFocus={false}
        >
          <NewsItemPreview
            item={item}
            pictureIndex={pictureIndex}
            onPictureIndexChange={setPictureIndex}
            onOpen={openPreviewDialog}
          />
        </PopoverContent>
      </Popover>
      <NewsItemPreviewDialog
        item={activeItem}
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
          delay={500}
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
