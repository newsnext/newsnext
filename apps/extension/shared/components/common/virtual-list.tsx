import type { RefObject } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { motion } from "motion/react"
import { useCallback } from "react"
import { cn } from "@/lib/utils"

interface VirtualListProps<T> {
  items: T[]
  scrollRef: RefObject<HTMLElement>
  estimateSize?: number
  className?: string
  itemClassName?: string
  getItemKey?: (item: T, index: number) => string | number
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
}: VirtualListItemProps<T>) {
  return (
    <motion.div
      ref={measureElement}
      layout="position"
      data-index={index}
      className={cn("absolute top-0 left-0 w-full", itemClassName)}
      animate={{ y: start }}
      initial={false}
      transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.7 }}
      style={{
        willChange: "transform",
      }}
    >
      {renderItem(item, index)}
    </motion.div>
  )
}

export function VirtualList<T>({
  items,
  scrollRef,
  estimateSize = 50,
  className,
  itemClassName,
  getItemKey,
  renderItem,
}: VirtualListProps<T>) {
  const resolveItemKey = useCallback((index: number) => {
    const item = items[index]
    return item ? getItemKey?.(item, index) ?? index : index
  }, [getItemKey, items])

  const rowVirtualizer = useVirtualizer({
    count: items?.length ?? 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    getItemKey: resolveItemKey,
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
