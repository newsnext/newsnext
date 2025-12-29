import type { RefObject } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { cn } from "@/lib/utils"

interface VirtualListProps<T> {
  items: T[]
  scrollRef: RefObject<HTMLElement>
  estimateSize?: number
  className?: string
  itemClassName?: string
  renderItem: (item: T, index: number) => React.ReactNode
}

export function VirtualList<T>({
  items,
  scrollRef,
  estimateSize = 50,
  className,
  itemClassName,
  renderItem,
}: VirtualListProps<T>) {
  const rowVirtualizer = useVirtualizer({
    count: items?.length ?? 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan: 5,
  })

  return (
    <div
      className={cn("relative w-full", className)}
      style={{
        height: `${rowVirtualizer.getTotalSize()}px`,
      }}
    >
      {rowVirtualizer.getVirtualItems().map(virtualItem =>
        (
          <div
            key={virtualItem.key}
            ref={rowVirtualizer.measureElement}
            data-index={virtualItem.index}
            className={cn("absolute top-0 left-0 w-full", itemClassName)}
            style={{
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ),
      )}
    </div>
  )
}
