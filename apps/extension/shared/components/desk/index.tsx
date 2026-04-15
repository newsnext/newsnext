import type { BoardType } from "@/store/board"
import { useEffect, useRef, useState } from "react"
import { CardBoard } from "@/components/card-board"
import { Dashboard } from "@/components/dashboard"
import { useScrollProgressContext } from "@/components/scroll-progress-context"
import { cn } from "@/lib/utils"

interface DeskProps {
  boardId?: BoardType
}

export function Desk({ boardId = "featured" }: DeskProps) {
  const [isScattered, setIsScattered] = useState(false)
  const boardLayerRef = useRef<HTMLDivElement>(null)
  const { dashboardScrollContainerRef, setIsDashboardActive } = useScrollProgressContext()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault()
        setIsScattered(prev => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    setIsDashboardActive(isScattered)

    return () => {
      setIsDashboardActive(false)
    }
  }, [isScattered, setIsDashboardActive])

  return (
    <div className="relative w-full">
      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 top-0 bottom-0 z-10 px-2 pt-22 pb-22 sm:px-6",
          isScattered && "pointer-events-auto",
        )}
      >
        <Dashboard
          isVisible={isScattered}
          onClose={() => setIsScattered(false)}
          scrollContainerRef={dashboardScrollContainerRef}
        />
      </div>

      <div
        ref={boardLayerRef}
        className={cn(
          "relative z-0 transition-all duration-300",
          isScattered && "pointer-events-none",
        )}
      >
        <CardBoard isScattered={isScattered} boardId={boardId} containerRef={boardLayerRef} />
      </div>
    </div>
  )
}
