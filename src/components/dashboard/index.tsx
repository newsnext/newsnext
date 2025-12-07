import { AnimatePresence, motion } from "motion/react"
import { Calendar } from "@/components/widgets/calendar"
import { Clock } from "@/components/widgets/clock"
import { SearchBar } from "@/components/widgets/search-bar"

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
      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto"
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
            className="w-full max-w-7xl px-4 flex flex-col items-center gap-12"
            onClick={e => e.stopPropagation()}
          >
            {/* Search Widget */}
            <div className="w-full max-w-2xl">
              <SearchBar autoFocus onSearch={onClose} />
            </div>

            {/* Other Widgets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
              <div className="flex justify-center">
                <Clock className="w-full max-w-sm aspect-square" />
              </div>
              <div className="flex justify-center">
                <Calendar className="w-full max-w-sm aspect-square flex items-center justify-center" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
