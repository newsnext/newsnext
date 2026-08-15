import type { BoardViewMode } from "@/lib/board"
import { useScrollProgressActionsContext } from "@newsnext/ui/components/scroll-progress-context"
import { useHotkey } from "@tanstack/react-hotkeys"
import { useAtomValue } from "jotai"
import { useEffect, useRef, useState } from "react"
import { NextLayer } from "@/components/nextlayer"
import { NowLayer } from "@/components/nowlayer"
import { ALL_BOARD_ID } from "@/lib/board"
import { DEFAULT_SHORTCUT_SETTINGS, SHORTCUT_DEFINITIONS } from "@/lib/settings"
import { cn } from "@/lib/utils"
import { shortcutSettingsAtom } from "@/store/settings"

export function BoardView({ boardId, defaultView }: { boardId: string, defaultView: BoardViewMode }) {
  const supportsNextLayer = boardId !== ALL_BOARD_ID
  const shortcuts = useAtomValue(shortcutSettingsAtom)
  const [isNextLayerVisible, setIsNextLayerVisible] = useState(
    supportsNextLayer && defaultView === "next",
  )
  const nowLayerRef = useRef<HTMLDivElement>(null)
  const {
    nextLayerScrollContainerRef,
    setIsNextLayerActive,
  } = useScrollProgressActionsContext()

  useHotkey(
    shortcuts.toggleNextLayer ?? DEFAULT_SHORTCUT_SETTINGS.toggleNextLayer,
    () => setIsNextLayerVisible(prev => !prev),
    {
      enabled: supportsNextLayer && shortcuts.toggleNextLayer !== null,
      meta: {
        name: SHORTCUT_DEFINITIONS.toggleNextLayer.label,
        description: SHORTCUT_DEFINITIONS.toggleNextLayer.description,
      },
      requireReset: true,
    },
  )

  useEffect(() => {
    setIsNextLayerActive(isNextLayerVisible)
  }, [isNextLayerVisible, setIsNextLayerActive])

  useEffect(() => {
    return () => {
      setIsNextLayerActive(false)
    }
  }, [setIsNextLayerActive])

  return (
    <div className="relative w-full">
      {supportsNextLayer && (
        <div
          className={cn(
            "pointer-events-none fixed inset-x-0 top-0 bottom-0 z-10 px-2 sm:px-6",
            isNextLayerVisible && "pointer-events-auto",
          )}
        >
          <NextLayer
            boardId={boardId}
            isVisible={isNextLayerVisible}
            scrollContainerRef={nextLayerScrollContainerRef}
          />
        </div>
      )}

      <div
        ref={nowLayerRef}
        className={cn(
          "relative z-0 transition-[opacity,transform] duration-300",
          isNextLayerVisible && "pointer-events-none",
        )}
      >
        <NowLayer boardId={boardId} isScattered={isNextLayerVisible} containerRef={nowLayerRef} />
      </div>
    </div>
  )
}
