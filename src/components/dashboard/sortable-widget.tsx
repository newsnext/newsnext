import { useSortable } from "@/hooks/use-sortable"
import { motion } from "motion/react"
import { ReactNode } from "react"
import { createPortal } from "react-dom"

interface SortableWidgetProps {
  id: string
  children: ReactNode
  className?: string
}

export function SortableWidget({ id, children, className }: SortableWidgetProps) {
  const { setNodeRef, setHandleRef, isDragging, OverlayContainer } = useSortable({ id })

  return (
    <>
      <motion.div
        layout
        initial={false}
        ref={(node) => {
          setNodeRef(node as HTMLElement)
          setHandleRef(node as HTMLElement)
        }}
        className={`${className ?? ""} ${isDragging ? "opacity-40" : ""}`}
      >
        {children}
      </motion.div>
      {isDragging && OverlayContainer && createPortal(children, OverlayContainer)}
    </>
  )
}
