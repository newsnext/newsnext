import type { BoardViewMode } from "@/lib/board"
import { useHotkey } from "@tanstack/react-hotkeys"
import { useAtomValue } from "jotai"
import { useRef, useState } from "react"
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

  return (
    <div className="relative w-full">
      {supportsNextLayer && isNextLayerVisible && (
        <div
          className="fixed inset-x-0 top-0 bottom-0 z-10 px-2 sm:px-6"
        >
          <NextLayer />
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
