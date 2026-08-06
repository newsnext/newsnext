import { useScrollProgressActionsContext } from "@newsnext/ui/components/scroll-progress-context"
import { useEffect, useRef, useState } from "react"
import { BoardItemsProvider } from "@/components/board-items-provider"
import { NextLayer } from "@/components/nextlayer"
import { NowLayer } from "@/components/nowlayer"
import { ALL_BOARD_ID } from "@/lib/boards"
import { cn } from "@/lib/utils"

export function Desk({ boardId }: { boardId: string }) {
  const supportsNextLayer = boardId !== ALL_BOARD_ID
  const [isScattered, setIsScattered] = useState(false)
  const nowLayerRef = useRef<HTMLDivElement>(null)
  const {
    nextLayerScrollContainerRef,
    setIsNextLayerActive,
  } = useScrollProgressActionsContext()

  useEffect(() => {
    if (!supportsNextLayer) {
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault()
        setIsScattered(prev => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [supportsNextLayer])

  useEffect(() => {
    setIsNextLayerActive(isScattered)
  }, [isScattered, setIsNextLayerActive])

  useEffect(() => {
    return () => {
      setIsNextLayerActive(false)
    }
  }, [setIsNextLayerActive])

  return (
    <BoardItemsProvider>
      <div className="relative w-full">
        {supportsNextLayer && (
          <div
            className={cn(
              "pointer-events-none fixed inset-x-0 top-0 bottom-0 z-10 px-2 sm:px-6",
              isScattered && "pointer-events-auto",
            )}
          >
            <NextLayer
              boardId={boardId}
              isVisible={isScattered}
              onClose={() => setIsScattered(false)}
              scrollContainerRef={nextLayerScrollContainerRef}
            />
          </div>
        )}

        <div
          ref={nowLayerRef}
          className={cn(
            "relative z-0 transition-[opacity,transform] duration-300",
            isScattered && "pointer-events-none",
          )}
        >
          <NowLayer boardId={boardId} isScattered={isScattered} containerRef={nowLayerRef} />
        </div>
      </div>
    </BoardItemsProvider>
  )
}
