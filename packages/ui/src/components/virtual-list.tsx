import { cn } from "@newsnext/ui/lib/utils"
import { useVirtualizer } from "@tanstack/react-virtual"

export interface VirtualListProps<T> {
  items: T[]
  scrollElement: HTMLElement | null
  estimateSize?: number
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

export function VirtualList<T>({
  items,
  scrollElement,
  estimateSize = 50,
  className,
  itemClassName,
  renderItem,
}: VirtualListProps<T>): React.JSX.Element {
  // TanStack Virtual returns unstable functions by design, so React Compiler must skip this boundary.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: items?.length ?? 0,
    getScrollElement: () => scrollElement,
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
      {rowVirtualizer.getVirtualItems().map((virtualItem) => {
        const item = items[virtualItem.index]
        if (item === undefined) return null

        return (
          <VirtualListItem
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
