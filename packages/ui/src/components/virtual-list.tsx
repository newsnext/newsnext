import { cn } from "@newsnext/ui/lib/utils"
import { useVirtualizer } from "@tanstack/react-virtual"
import { memo, useCallback } from "react"

export interface VirtualListProps<T> {
  items: T[]
  /** Committed scroll element (state-backed), never a bare mutable ref. */
  scrollElement: HTMLElement | null
  estimateSize?: number
  getItemKey?: (item: T, index: number) => string | number
  /** Keep the visible item in place when entries are prepended or trimmed. */
  preserveScrollPosition?: boolean
  className?: string
  itemClassName?: string
  renderItem: (item: T, index: number) => React.ReactNode
}

interface VirtualListItemProps<T> {
  item: T
  index: number
  itemClassName?: string
  start: number
  measureElement: (node: Element | null) => void
  renderItem: (item: T, index: number) => React.ReactNode
}

function VirtualListItem<T>({
  item,
  index,
  itemClassName,
  start,
  measureElement,
  renderItem,
}: VirtualListItemProps<T>): React.JSX.Element {
  return (
    <div
      ref={measureElement}
      data-index={index}
      className={cn("absolute top-0 left-0 w-full", itemClassName)}
      style={{
        transform: `translateY(${start}px)`,
      }}
    >
      {renderItem(item, index)}
    </div>
  )
}

// Scroll commits should update only rows whose item, position, or renderer changed.
const MemoizedVirtualListItem = memo(VirtualListItem) as typeof VirtualListItem

export function VirtualList<T>({
  items,
  scrollElement,
  estimateSize = 50,
  getItemKey,
  preserveScrollPosition = false,
  className,
  itemClassName,
  renderItem,
}: VirtualListProps<T>): React.JSX.Element {
  const getKey = useCallback((index: number) => {
    const item = items[index]
    return item === undefined ? index : getItemKey?.(item, index) ?? index
  }, [getItemKey, items])
  // TanStack Virtual returns unstable functions by design, so React Compiler must skip this boundary.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => estimateSize,
    getItemKey: getKey,
    anchorTo: preserveScrollPosition ? "end" : "start",
    overscan: 5,
  })

  return (
    <div
      className={cn("relative w-full", className)}
      style={{
        height: `${rowVirtualizer.getTotalSize()}px`,
      }}
    >
      {rowVirtualizer.getVirtualItems().map((virtualItem) => {
        const item = items[virtualItem.index]
        if (item === undefined) return null

        return (
          <MemoizedVirtualListItem
            key={virtualItem.key}
            item={item}
            index={virtualItem.index}
            itemClassName={itemClassName}
            start={virtualItem.start}
            measureElement={rowVirtualizer.measureElement}
            renderItem={renderItem}
          />
        )
      })}
    </div>
  )
}
