import type { ReactNode } from "react"
import type { BoardSource, NewsItem } from "@/typings/source"
import { Button } from "@newsnext/ui/components/button"
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@newsnext/ui/components/dialog"
import { cn } from "@newsnext/ui/lib/utils"
import { ExternalLink, X } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import Card from "../card"
import { ExpandedPreviewContext } from "./expanded-preview-context"
import { NewsItemPreviewContent } from "./news-item-preview"

interface ExpandedPreviewState {
  cardId: string
  source: BoardSource
  item: NewsItem
}

interface ExpandedPreviewDialogProps {
  cardId: string
  source: BoardSource
  selectedItem?: NewsItem
  onSelectedItemChange: (item: NewsItem | undefined) => void
  onOpenChange: (open: boolean) => void
}

export function ExpandedPreviewDialog({
  cardId,
  source,
  selectedItem,
  onSelectedItemChange,
  onOpenChange,
}: ExpandedPreviewDialogProps): ReactNode {
  const selectedHost = getUrlHost(selectedItem?.url)

  return (
    <Dialog open={!!selectedItem} onOpenChange={open => onOpenChange(open)}>
      <DialogContent
        radius="4xl"
        className="w-[92vw] max-h-[calc(100vh-4rem)] sm:max-w-200"
        surfaceClassName={cn(`sprinkle-${source.color}-400`, "overflow-hidden bg-neutral-50 p-0 gap-0 text-neutral-950 shadow-2xl ring-neutral-950/10 dark:bg-background dark:text-foreground dark:ring-foreground/10")}
        showCloseButton={false}
      >
        <DialogHeader className="flex min-w-0 flex-row items-center justify-between gap-3 border-b border-neutral-200/80 pl-6 pr-3 py-2 dark:border-border/60">
          <DialogTitle className="min-w-0 flex-1 overflow-hidden truncate text-lg">
            {selectedItem?.title || "Preview"}
          </DialogTitle>
          <div className="flex min-w-fit shrink-0 items-center">
            {selectedItem?.url && (
              <a
                href={selectedItem.url}
                target="_blank"
                rel="noreferrer"
                title={selectedHost}
                className="inline-flex h-8 min-w-0 max-w-48 items-center gap-1.5 rounded-3xl px-2.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-950 dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
              >
                <span className="truncate">{selectedHost}</span>
                <ExternalLink className="size-3.5 shrink-0" />
              </a>
            )}
            <DialogClose
              render={(
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950 dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
                />
              )}
            >
              <X />
              <span className="sr-only">Close preview</span>
            </DialogClose>
          </div>
        </DialogHeader>
        <div className="flex min-h-0 h-131">
          <aside className="min-w-0 flex flex-1 flex-col">
            {selectedItem
              ? (
                  <article className="mx-auto flex w-full max-w-180 flex-1 flex-col overflow-y-auto p-6 leading-7">
                    <NewsItemPreviewContent
                      item={selectedItem}
                      className="gap-4 text-foreground/90"
                    />
                  </article>
                )
              : (
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <article className="mx-auto flex min-h-full w-full max-w-180 flex-col p-6 sm:p-8">
                      <ExpandedPreviewEmptyState />
                    </article>
                  </div>
                )}
          </aside>
          <aside className="hidden shrink-0 p-3 sm:block border-l">
            <Card
              id={cardId}
              source={source}
              className="shrink-0"
              disableExpandedPreview
              previewSelection={{
                selectedItemUrl: selectedItem?.url,
                onSelectItem: onSelectedItemChange,
              }}
            />
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ExpandedPreviewEmptyState(): ReactNode {
  return (
    <div className="flex min-h-full items-center justify-center text-sm text-muted-foreground">
      Select an item to preview.
    </div>
  )
}

function getUrlHost(url?: string): string {
  if (!url) {
    return ""
  }

  try {
    return new URL(url).host
  } catch {
    return url
  }
}

export function ExpandedPreviewProvider({ children }: { children: ReactNode }): ReactNode {
  const [expandedPreview, setExpandedPreview] = useState<ExpandedPreviewState>()

  const openExpandedPreview = useCallback((cardId: string, source: BoardSource, item: NewsItem) => {
    setExpandedPreview({ cardId, source, item })
  }, [])

  const handleExpandedPreviewItemChange = useCallback((item: NewsItem | undefined) => {
    setExpandedPreview(prev => prev && item ? { ...prev, item } : undefined)
  }, [])

  const contextValue = useMemo(
    () => ({
      openExpandedPreview,
      isExpandedPreviewOpen: Boolean(expandedPreview),
    }),
    [openExpandedPreview, expandedPreview],
  )

  return (
    <ExpandedPreviewContext.Provider value={contextValue}>
      {children}
      {expandedPreview && (
        <ExpandedPreviewDialog
          cardId={expandedPreview.cardId}
          source={expandedPreview.source}
          selectedItem={expandedPreview.item}
          onSelectedItemChange={handleExpandedPreviewItemChange}
          onOpenChange={(open) => {
            if (!open) {
              setExpandedPreview(undefined)
            }
          }}
        />
      )}
    </ExpandedPreviewContext.Provider>
  )
}
