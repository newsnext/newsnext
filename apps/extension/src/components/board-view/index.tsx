import type { PropsWithChildren } from "react"
import type { Board, BoardLayer } from "@/lib/board"
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { useScrollProgressContext } from "@newsnext/ui/components/scroll-progress-context"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { useHotkey } from "@tanstack/react-hotkeys"
import { useElementScrollRestoration, useNavigate } from "@tanstack/react-router"
import { useAtomValue, useSetAtom } from "jotai"
import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react"
import { NextLayer } from "@/components/nextlayer"
import { NowLayer } from "@/components/nowlayer"
import { isSortableData } from "@/lib/board"
import {
  getBoardScrollRestorationKey,
  ROOT_SCROLL_RESTORATION_ID,
} from "@/lib/scroll-restoration"
import { DEFAULT_SHORTCUT_SETTINGS, SHORTCUT_DEFINITIONS } from "@/lib/settings"
import { cn } from "@/lib/utils"
import { moveInstanceAtom, updateBoardAtom } from "@/store/board"
import { shortcutSettingsAtom } from "@/store/settings"
import { ScatterCardLayer } from "./scatter-card-layer"

const BOARD_CONTENT_INSET_CLASS_NAME = "px-2 pb-6 xs:px-6"
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
  const { rootScrollContainer } = useScrollProgressContext()
  const shortcuts = useAtomValue(shortcutSettingsAtom)
  const moveInstance = useSetAtom(moveInstanceAtom)
  const updateBoard = useSetAtom(updateBoardAtom)
  const navigate = useNavigate({ from: "/board/$boardId" })
  const isNextLayer = layer === "next"
  const [renderedView, setRenderedView] = useState<RenderedView>({ boardId: board.id, layer })
  const [isSearchTransferOver, setIsSearchTransferOver] = useState(false)
  const boardDropTargetRef = useRef<HTMLDivElement>(null)
  const [entranceReadyViewKey, setEntranceReadyViewKey] = useState<string | null>(null)
  const restoredViewKeyRef = useRef<string | null>(null)
  const scrollRestorationEntry = useElementScrollRestoration({
    id: ROOT_SCROLL_RESTORATION_ID,
    getKey: getBoardScrollRestorationKey,
  })
  const isOutgoing = renderedView.layer !== layer || renderedView.boardId !== board.id
  const renderedLayerState = isOutgoing ? "outgoing" : "active"
  const isRenderedNextLayer = renderedView.layer === "next"
  const renderedViewKey = `${renderedView.boardId}:${renderedView.layer}`
  const entranceReady = entranceReadyViewKey === renderedViewKey

  const moveSearchLiveCard = useEffectEvent(async (instanceId: string) => {
    try {
      await moveInstance({
        boardId: board.id,
        instanceId,
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
        && source.data.ids.length === 1
        && !board.instanceIds.includes(source.data.id),
      getDropEffect: () => "move",
      onDragEnter: () => setIsSearchTransferOver(true),
      onDragLeave: () => setIsSearchTransferOver(false),
      onDrop: ({ source }) => {
        setIsSearchTransferOver(false)
        if (!isSortableData(source.data)) return
        void moveSearchLiveCard(source.data.id)
      },
    })
  }, [board.id, board.instanceIds])

  useLayoutEffect(() => {
    if (isOutgoing || !rootScrollContainer) return

    if (restoredViewKeyRef.current !== renderedViewKey) {
      restoredViewKeyRef.current = renderedViewKey
      rootScrollContainer.scrollTo({
        behavior: "instant",
        left: scrollRestorationEntry?.scrollX ?? 0,
        top: scrollRestorationEntry?.scrollY ?? 0,
      })
    }
    if (entranceReadyViewKey === renderedViewKey) return

    let idleCallbackId: number | undefined
    let entranceFrameId: number | undefined
    const settleFrameId = window.requestAnimationFrame(() => {
      idleCallbackId = window.requestIdleCallback(() => {
        entranceFrameId = window.requestAnimationFrame(() => {
          setEntranceReadyViewKey(renderedViewKey)
        })
      }, { timeout: 300 })
    })

    return () => {
      window.cancelAnimationFrame(settleFrameId)
      if (idleCallbackId !== undefined) window.cancelIdleCallback(idleCallbackId)
      if (entranceFrameId !== undefined) window.cancelAnimationFrame(entranceFrameId)
    }
  }, [
    entranceReadyViewKey,
    isOutgoing,
    renderedViewKey,
    rootScrollContainer,
    scrollRestorationEntry?.scrollX,
    scrollRestorationEntry?.scrollY,
  ])

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
    <div ref={boardDropTargetRef} className="relative flex min-h-0 w-full grow flex-col">
      {isSearchTransferOver && (
        <SquircleBox
          aria-hidden
          radius="4xl"
          className="pointer-events-none absolute inset-4 z-40 border-2 border-dashed border-theme-400 bg-theme-400/10"
        />
      )}
      <ScatterCardLayer
        key={renderedViewKey}
        state={renderedLayerState}
        onExitComplete={handleExitComplete}
        itemSelector={isRenderedNextLayer
          ? ".grid-stack-item:not(.grid-stack-placeholder)"
          : "[data-live-card-id]"}
        className="relative z-0"
      >
        {isRenderedNextLayer
          ? (
              <BoardContent>
                <NextLayer
                  boardId={renderedView.boardId}
                  entranceReady={entranceReady}
                />
              </BoardContent>
            )
          : (
              <BoardContent>
                <NowLayer
                  boardId={renderedView.boardId}
                  entranceReady={entranceReady}
                />
              </BoardContent>
            )}
      </ScatterCardLayer>
    </div>
  )
}
