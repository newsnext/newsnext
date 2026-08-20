import type { PropsWithChildren } from "react"
import type { Board, BoardLayer } from "@/lib/board"
import { useScrollProgressContext } from "@newsnext/ui/components/scroll-progress-context"
import { useHotkey } from "@tanstack/react-hotkeys"
import { useNavigate } from "@tanstack/react-router"
import { useAtomValue, useSetAtom } from "jotai"
import { useCallback, useState } from "react"
import { NextLayer } from "@/components/nextlayer"
import { NowLayer } from "@/components/nowlayer"
import { NEXT_LAYER_SCROLL_RESTORATION_ID } from "@/lib/scroll-restoration"
import { DEFAULT_SHORTCUT_SETTINGS, SHORTCUT_DEFINITIONS } from "@/lib/settings"
import { cn } from "@/lib/utils"
import { updateBoardAtom } from "@/store/board"
import { shortcutSettingsAtom } from "@/store/settings"
import { ScatterCardLayer } from "./scatter-card-layer"

const BOARD_CONTENT_INSET_CLASS_NAME = "px-2 pb-6 sm:px-6"
const BOARD_CONTENT_WIDTH_CLASS_NAME = "mx-auto w-full max-w-[104.5rem]"

function BoardContent({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn(BOARD_CONTENT_INSET_CLASS_NAME, className)}>
      <div className={BOARD_CONTENT_WIDTH_CLASS_NAME}>{children}</div>
    </div>
  )
}

interface RenderedView {
  boardId: string
  layer: BoardLayer
}

export function BoardView({ board, layer }: { board: Board, layer: BoardLayer }) {
  const { setNextLayerScrollContainer } = useScrollProgressContext()
  const shortcuts = useAtomValue(shortcutSettingsAtom)
  const updateBoard = useSetAtom(updateBoardAtom)
  const navigate = useNavigate({ from: "/board/$boardId" })
  const isNextLayer = layer === "next"
  const [renderedView, setRenderedView] = useState<RenderedView>({ boardId: board.id, layer })
  const isOutgoing = renderedView.layer !== layer || renderedView.boardId !== board.id
  const renderedLayerState = isOutgoing ? "outgoing" : "active"
  const isRenderedNextLayer = renderedView.layer === "next"

  const handleExitComplete = useCallback(() => {
    setRenderedView({ boardId: board.id, layer })
  }, [board.id, layer])

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
    <div className="relative flex min-h-0 w-full grow flex-col">
      <ScatterCardLayer
        key={`${renderedView.boardId}:${renderedView.layer}`}
        state={renderedLayerState}
        onExitComplete={handleExitComplete}
        itemSelector={isRenderedNextLayer
          ? ".grid-stack-item:not(.grid-stack-placeholder)"
          : "[data-live-card-id]"}
        className={isRenderedNextLayer
          ? "absolute inset-0 z-10"
          : "relative z-0"}
      >
        {isRenderedNextLayer
          ? (
              <div
                ref={setNextLayerScrollContainer}
                data-board-id={renderedView.boardId}
                data-scroll-restoration-id={NEXT_LAYER_SCROLL_RESTORATION_ID}
                className="h-full w-full overflow-y-auto bg-transparent scrollbar-hidden"
              >
                <BoardContent className="min-h-full">
                  <NextLayer boardId={renderedView.boardId} />
                </BoardContent>
              </div>
            )
          : (
              <BoardContent>
                <NowLayer boardId={renderedView.boardId} />
              </BoardContent>
            )}
      </ScatterCardLayer>
    </div>
  )
}
