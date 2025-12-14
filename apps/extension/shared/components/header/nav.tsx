import type { BoardType } from "@/store/board"
import { useAtom } from "jotai"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import { currentBoardAtom } from "@/store/board"

const TABS: { label: string, value: BoardType }[] = [
  { label: "Hottest", value: "hottest" },
  { label: "Timeline", value: "timeline" },
  { label: "Realtime", value: "realtime" },
]

function Nav() {
  const [currentBoard, setCurrentBoard] = useAtom(currentBoardAtom)

  return (
    <div className="island-pill flex gap-2 items-center px-2 pointer-events-auto">
      {TABS.map((tab) => {
        const isActive = currentBoard === tab.value
        return (
          <button
            key={tab.value}
            onClick={() => setCurrentBoard(tab.value)}
            className={cn(
              "relative px-2 py-0.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              isActive
                ? "text-white"
                : "text-white/70 hover:text-white",
            )}
          >
            {isActive && (
              <motion.div
                layoutId="active-tab"
                className="absolute inset-0 bg-theme-400 rounded-full shadow-md"
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 30,
                }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default Nav
