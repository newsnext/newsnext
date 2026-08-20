import type { Board, BoardLayer } from "@/lib/board"
import { useHotkey } from "@tanstack/react-hotkeys"
import { useNavigate } from "@tanstack/react-router"
import { useAtomValue, useSetAtom } from "jotai"
import { useRef } from "react"
import { NextLayer } from "@/components/nextlayer"
import { NowLayer } from "@/components/nowlayer"
import { DEFAULT_SHORTCUT_SETTINGS, SHORTCUT_DEFINITIONS } from "@/lib/settings"
import { cn } from "@/lib/utils"
import { updateBoardAtom } from "@/store/board"
import { shortcutSettingsAtom } from "@/store/settings"

export function BoardView({ board, layer }: { board: Board, layer: BoardLayer }) {
  const shortcuts = useAtomValue(shortcutSettingsAtom)
  const updateBoard = useSetAtom(updateBoardAtom)
  const navigate = useNavigate({ from: "/board/$boardId" })
  const isNextLayer = layer === "next"
  const nowLayerRef = useRef<HTMLDivElement>(null)

  async function handleToggleLayer(): Promise<void> {
    const nextLayer = isNextLayer ? "now" : "next"
    try {
      await navigate({
        state: state => ({ ...state, layer: nextLayer }),
      })
      await updateBoard({ ...board, defaultLayer: nextLayer })
    } catch (error) {
      console.error("Failed to update the default Board layer", error)
    }
  }

  useHotkey(
    shortcuts.toggleNextLayer ?? DEFAULT_SHORTCUT_SETTINGS.toggleNextLayer,
    () => void handleToggleLayer(),
    {
      enabled: shortcuts.toggleNextLayer !== null,
      meta: {
        name: SHORTCUT_DEFINITIONS.toggleNextLayer.label,
        description: SHORTCUT_DEFINITIONS.toggleNextLayer.description,
      },
      requireReset: true,
    },
  )

  return (
    <div className="relative w-full">
      {isNextLayer && (
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
          isNextLayer && "pointer-events-none",
        )}
      >
        <NowLayer boardId={board.id} isScattered={isNextLayer} containerRef={nowLayerRef} />
      </div>
    </div>
  )
}
