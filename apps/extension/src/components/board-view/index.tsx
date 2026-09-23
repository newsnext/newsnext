import type { PropsWithChildren } from "react"
import type { Board, BoardLayer } from "@/lib/board"
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { useHotkey } from "@tanstack/react-hotkeys"
import { useNavigate } from "@tanstack/react-router"
import { useAtomValue, useSetAtom } from "jotai"
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react"
import { NextLayer } from "@/components/nextlayer"
import { NowLayer } from "@/components/nowlayer"
import { useBoardScrollRestoration } from "@/hooks/use-board-scroll-restoration"
import { isSortableData } from "@/lib/board"
import { DEFAULT_SHORTCUT_SETTINGS, SHORTCUT_DEFINITIONS } from "@/lib/settings"
import { moveLiveCardAtom } from "@/store/board"
import { shortcutSettingsAtom } from "@/store/settings"
import { ScatterCardLayer } from "./scatter-card-layer"

const BOARD_CONTENT_INSET_CLASS_NAME = "px-2 pb-6 xs:px-6"
const BOARD_CONTENT_WIDTH_CLASS_NAME = "mx-auto w-full max-w-[104.5rem]"

function BoardContent({ children }: PropsWithChildren) {
  return (
    <div className={BOARD_CONTENT_INSET_CLASS_NAME}>
      <div className={BOARD_CONTENT_WIDTH_CLASS_NAME}>{children}</div>
    </div>
  )
}

interface RenderedView {
  boardId: string
  layer: BoardLayer
  revision: number
}

export function BoardView({ board, layer }: { board: Board, layer: BoardLayer }) {
  const shortcuts = useAtomValue(shortcutSettingsAtom)
  const moveLiveCard = useSetAtom(moveLiveCardAtom)
  const navigate = useNavigate()
  const isNextLayer = layer === "next"
  const [renderedView, setRenderedView] = useState<RenderedView>({ boardId: board.id, layer, revision: 0 })
  const [outgoingView, setOutgoingView] = useState<RenderedView | null>(null)
  const [isSearchTransferOver, setIsSearchTransferOver] = useState(false)
  const boardDropTargetRef = useRef<HTMLDivElement>(null)
  const [loadedViewKey, setLoadedViewKey] = useState<string | null>(null)
  const [enteredViewKey, setEnteredViewKey] = useState<string | null>(null)
  const renderedViewKey = `${renderedView.boardId}:${renderedView.layer}:${renderedView.revision}`
  const contentReady = renderedView.layer === "now" || loadedViewKey === renderedViewKey
  const viewReady = useBoardScrollRestoration({
    boardId: renderedView.boardId,
    layer: renderedView.layer,
    viewKey: renderedViewKey,
    contentReady,
  })

  if (renderedView.boardId !== board.id || renderedView.layer !== layer) {
    if (viewReady) setOutgoingView(renderedView)
    setRenderedView({ boardId: board.id, layer, revision: renderedView.revision + 1 })
    setLoadedViewKey(null)
    setEnteredViewKey(null)
  }

  const moveSearchLiveCard = useEffectEvent(async (cardId: string) => {
    try {
      await moveLiveCard({
        boardId: board.id,
        cardId,
      })
    } catch (error) {
      console.error("Failed to move dropped LiveCard", error)
    }
  })

  useEffect(() => {
    const dropTarget = boardDropTargetRef.current
    if (!dropTarget) return

    return dropTargetForElements({
      element: dropTarget,
      canDrop: ({ source }) => isSortableData(source.data)
        && !board.nowLayer.liveCards.some(card => card.cardId === source.data.id),
      getDropEffect: () => "move",
      onDragEnter: () => setIsSearchTransferOver(true),
      onDragLeave: () => setIsSearchTransferOver(false),
      onDrop: ({ source }) => {
        setIsSearchTransferOver(false)
        if (!isSortableData(source.data)) return
        void moveSearchLiveCard(source.data.id)
      },
    })
  }, [board.id, board.nowLayer.liveCards])

  const handleContentReady = useCallback(() => {
    setLoadedViewKey(renderedViewKey)
  }, [renderedViewKey])

  const handleEnterComplete = useCallback(() => {
    setEnteredViewKey(renderedViewKey)
  }, [renderedViewKey])

  function handleToggleLayer(): void {
    const nextLayer = isNextLayer ? "now" : "next"
    void navigate({
      to: "/board/$boardId",
      params: { boardId: board.id },
      search: { layer: nextLayer },
      replace: true,
    })
  }

  useHotkey(
    shortcuts.toggleNextLayer ?? DEFAULT_SHORTCUT_SETTINGS.toggleNextLayer,
    handleToggleLayer,
    {
      enabled: shortcuts.toggleNextLayer !== null,
      meta: {
        name: SHORTCUT_DEFINITIONS.toggleNextLayer.label,
        description: SHORTCUT_DEFINITIONS.toggleNextLayer.description,
      },
      requireReset: true,
    },
  )

  const views = outgoingView ? [outgoingView, renderedView] : [renderedView]

  return (
    <div ref={boardDropTargetRef} className="relative flex min-h-0 w-full grow flex-col">
      {isSearchTransferOver && (
        <SquircleBox
          aria-hidden
          radius="4xl"
          className="pointer-events-none absolute inset-4 z-40 border-2 border-dashed border-theme-400 bg-theme-400/10"
        />
      )}
      {views.map((view) => {
        const key = `${view.boardId}:${view.layer}:${view.revision}`
        const outgoing = view !== renderedView
        // Clear only the matching departed view; a stale exit must not remove a newer outgoing view.
        return (
          <ScatterCardLayer
            key={key}
            state={outgoing ? "outgoing" : "active"}
            onEnterComplete={handleEnterComplete}
            onExitComplete={() => setOutgoingView(current => current === view ? null : current)}
            viewReady={outgoing || viewReady}
            itemSelector={view.layer === "next"
              ? "[data-widget-transition]"
              : "[data-live-card-transition]"}
            className="relative z-0"
          >
            <BoardContent>
              {view.layer === "next"
                ? (
                    <NextLayer
                      boardId={view.boardId}
                      onReady={outgoing ? undefined : handleContentReady}
                      viewReady={!outgoing && viewReady}
                    />
                  )
                : <NowLayer boardId={view.boardId} viewReady={!outgoing && enteredViewKey === key} />}
            </BoardContent>
          </ScatterCardLayer>
        )
      })}
    </div>
  )
}
