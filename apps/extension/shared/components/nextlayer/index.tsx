import type { RefObject } from "react"
import { AnimatePresence, motion } from "motion/react"

interface NextLayerProps {
  isVisible: boolean
  onClose: () => void
  scrollContainerRef?: RefObject<HTMLDivElement | null>
}

export function NextLayer({ isVisible, onClose, scrollContainerRef }: NextLayerProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose()
    }
  }

  return (
    <div
      ref={scrollContainerRef}
      className="h-full w-full overflow-y-auto bg-transparent scrollbar-hidden"
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
            className="mx-auto flex min-h-full w-full max-w-7xl flex-col items-center gap-12"
            onClick={e => e.stopPropagation()}
          >
            OPEN EYES
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
