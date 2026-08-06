import { useScrollProgressActionsContext } from "@newsnext/ui/components/scroll-progress-context"
import { useHotkey } from "@tanstack/react-hotkeys"
import { useAtomValue } from "jotai"
import { useEffect, useRef, useState } from "react"
import { BoardItemsProvider } from "@/components/board-items-provider"
import { NextLayer } from "@/components/nextlayer"
import { NowLayer } from "@/components/nowlayer"
import { ALL_BOARD_ID } from "@/lib/boards"
import { DEFAULT_SHORTCUT_SETTINGS, SHORTCUT_DEFINITIONS } from "@/lib/shortcuts"
import { cn } from "@/lib/utils"
import { shortcutSettingsAtom } from "@/store/settings"

export function Desk({ boardId }: { boardId: string }) {
  const supportsNextLayer = boardId !== ALL_BOARD_ID
  const shortcuts = useAtomValue(shortcutSettingsAtom)
  const [isScattered, setIsScattered] = useState(false)
  const nowLayerRef = useRef<HTMLDivElement>(null)
  const {
    nextLayerScrollContainerRef,
    setIsNextLayerActive,
  } = useScrollProgressActionsContext()

  useHotkey(
    shortcuts.toggleNextLayer ?? DEFAULT_SHORTCUT_SETTINGS.toggleNextLayer,
    () => setIsScattered(prev => !prev),
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
