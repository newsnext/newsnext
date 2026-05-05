import type { ReactNode } from "react"
import type { BoardSource, NewsItem } from "@/typings/source"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@newsnext/ui/components/dialog"
import { useCallback, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
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
}: ExpandedPreviewDialogProps) {
  return (
    <Dialog open={!!selectedItem} onOpenChange={open => onOpenChange(open)}>
      <DialogContent
        className={cn("border rounded-[40px] p-3 gap-0 overflow-hidden w-[80vw] max-h-[80vh] max-w-189!", `bg-background`)}
        showCloseButton={false}
      >
        <div className="flex gap-3 h-125">
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
          <section className="overflow-y-auto w-80 rounded-r-4xl scrollbar-hidden">
            {selectedItem
              ? (
                  <NewsItemPreviewContent item={selectedItem} className="text-sm" />
                )
              : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Select an item to preview.
                  </div>
                )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function ExpandedPreviewProvider({ children }: { children: ReactNode }) {
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
