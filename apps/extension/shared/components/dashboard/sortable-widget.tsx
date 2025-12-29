import type { ReactNode } from "react"
import { motion } from "motion/react"
import { useCallback } from "react"
import { createRoot } from "react-dom/client"
import { useSortable } from "@/hooks/use-sortable"
import { cn } from "@/lib/utils"

interface SortableWidgetProps {
  id: string
  children: ReactNode
  className?: string
}

export function SortableWidget({ id, children, className }: SortableWidgetProps) {
  const onGenerateDragPreview = useCallback(
    ({ container, element }: { container: HTMLElement, element: HTMLElement }) => {
      container.style.width = `${element.clientWidth}px`
      container.style.height = `${element.clientHeight}px`

      const root = createRoot(container)
      root.render(children)
      return () => root.unmount()
    },
    [children],
  )

  const { setNodeRef, setHandleRef, isDragging } = useSortable({
    id,
    onGenerateDragPreview,
  })

  return (
    <motion.div
      layout
      initial={false}
      ref={(node) => {
        setNodeRef(node as HTMLElement)
        setHandleRef(node as HTMLElement)
      }}
      className={cn(className, isDragging && "opacity-40")}
    >
      {children}
    </motion.div>
  )
}
