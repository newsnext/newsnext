import type { BaseEventPayload, ElementDragType } from "@atlaskit/pragmatic-drag-and-drop/dist/types/internal-types"
import { useThrottleFn } from "@newsnext/ui/hooks/use-throttle-fn"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useRef, useState } from "react"
import { DndContext } from "@/hooks/use-dnd-context"
import { reorder } from "@/lib/utils/reorder"

interface DashboardProps {
  isVisible: boolean
  onClose: () => void
}

export function Dashboard({ isVisible, onClose }: DashboardProps) {
  // Handle escape key at dashboard level
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose()
    }
  }

  return (
    <div
      className="h-full flex flex-col items-center pointer-events-auto overflow-y-auto bg-transparent scrollbar-hidden"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2, delay: 0.2 }}
            className="w-full h-full max-w-7xl px-4 py-8 pb-16 flex flex-col items-center gap-12"
            onClick={e => e.stopPropagation()}
          >
            OPEN EYES
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
