import type { BoardType } from "@/store/board"
import { useEffect, useState } from "react"
import { CardBoard } from "@/components/card-board"
import { Dashboard } from "@/components/dashboard"
import { cn } from "@/lib/utils"

interface DeskProps {
  boardId?: BoardType
}

export function Desk({ boardId = "hottest" }: DeskProps) {
  const [isScattered, setIsScattered] = useState(false)

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

  return (
    <div className="grid w-full h-full">
      <div className={cn("col-start-1 row-start-1 z-0 h-full", isScattered ? "pointer-events-auto" : "pointer-events-none")}>
        <Dashboard isVisible={isScattered} onClose={() => setIsScattered(false)} />
      </div>

      <div
        className={cn(
          "col-start-1 row-start-1 relative z-10 h-full transition-all duration-300",
          isScattered && "pointer-events-none",
        )}
      >
        <CardBoard isScattered={isScattered} boardId={boardId} />
      </div>
    </div>
  )
}
