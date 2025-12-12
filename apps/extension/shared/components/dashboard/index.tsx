import type { BaseEventPayload, ElementDragType } from "@atlaskit/pragmatic-drag-and-drop/dist/types/internal-types"
import { useThrottleFn } from "@newsnext/ui/hooks/use-throttle-fn"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useState } from "react"
import { SearchBar } from "@/components/widgets"
import { DndContext } from "@/hooks/use-dnd-context"
import { reorder } from "@/lib/utils/reorder"
import { SortableWidget } from "./sortable-widget"
import { initialWidgets } from "./widgets-config"

interface DashboardProps {
  isVisible: boolean
  onClose: () => void
}

export function Dashboard({ isVisible, onClose }: DashboardProps) {
  const [widgets, setWidgets] = useState(initialWidgets)

  // Handle escape key at dashboard level
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose()
    }
  }

  const handleReorder = useCallback(
    ({ source, location }: BaseEventPayload<ElementDragType>) => {
      const destination = location.current.dropTargets[0]
      if (!destination) {
        return
      }
      const sourceId = source.data.id as string
      const destinationId = destination.data.id as string

      const sourceIndex = widgets.findIndex(w => w.id === sourceId)
      const destinationIndex = widgets.findIndex(w => w.id === destinationId)

      if (sourceIndex === -1 || destinationIndex === -1) {
        return
      }

      // Only reorder if the index changed
      if (sourceIndex === destinationIndex) {
        return
      }

      const newWidgets = reorder(widgets, sourceIndex, destinationIndex)
      setWidgets(newWidgets)
    },
    [widgets],
  )

  const { run: handleDropTargetChange } = useThrottleFn(handleReorder, 200, {
    edges: ["trailing"],
  })

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
            className="w-full max-w-7xl px-4 py-8 pb-16 flex flex-col items-center gap-12"
            onClick={e => e.stopPropagation()}
          >
            {/* Search Widget */}
            <div className="w-full max-w-2xl">
              <SearchBar autoFocus onSearch={onClose} />
            </div>

            {/* Widgets Grid */}
            <DndContext onDropTargetChange={handleDropTargetChange}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
                {widgets.map(widget => (
                  <SortableWidget key={widget.id} id={widget.id} className={widget.className}>
                    {widget.component}
                  </SortableWidget>
                ))}
              </div>
            </DndContext>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
