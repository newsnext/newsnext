import type { BoardDialogTarget } from "@/components/board-dialog"
import type { Board } from "@/lib/board"
import { Button } from "@newsnext/ui/components/button"
import {
  PillGroup,
  PillGroupIndicator,
  pillGroupItemClassName,
} from "@newsnext/ui/components/pill-group"
import { useHotkeys } from "@tanstack/react-hotkeys"
import { useNavigate } from "@tanstack/react-router"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { useState } from "react"
import { BoardDialog } from "@/components/board-dialog"
import { PhPlusCircle } from "@/components/icons/ph"
import { ALL_BOARD_ID, getAdjacentBoardId } from "@/lib/board"
import { DEFAULT_SHORTCUT_SETTINGS, SHORTCUT_DEFINITIONS } from "@/lib/settings"
import { cn } from "@/lib/utils"
import {
  boardsAtom,
  createBoardAtom,
  deleteBoardAtom,
  updateBoardAtom,
} from "@/store/board"
import { currentBoardIdAtom, shortcutSettingsAtom } from "@/store/settings"

const INTERACTIVE_BOARD_NAV_SELECTOR = [
  "button",
  "input",
  "textarea",
  "select",
  "[contenteditable]",
  "[role=dialog]",
  "[role=menu]",
  "[role=tab]",
  "[role=slider]",
  "[role=menuitem]",
  "[role=listbox]",
  "[role=option]",
].join(", ")

export function BoardNav() {
  const boards = useAtomValue(boardsAtom)
  const navigate = useNavigate()
  const [currentBoardId, setCurrentBoardId] = useAtom(currentBoardIdAtom)
  const shortcuts = useAtomValue(shortcutSettingsAtom)
  const addBoard = useSetAtom(createBoardAtom)
  const updateBoard = useSetAtom(updateBoardAtom)
  const deleteBoard = useSetAtom(deleteBoardAtom)
  const [dialogTarget, setDialogTarget] = useState<BoardDialogTarget | null>(null)

  function openBoard(boardId: string): void {
    setCurrentBoardId(boardId)
    void navigate({ to: "/board/$boardId", params: { boardId } })
  }

  function switchBoard(offset: -1 | 1, event: KeyboardEvent): void {
    const target = event.target
    if (target instanceof HTMLElement) {
      const interactive = target.closest<HTMLElement>(INTERACTIVE_BOARD_NAV_SELECTOR)
      if (interactive && !interactive.hasAttribute("data-board-tab")) {
        return
      }
    }

    const nextBoardId = getAdjacentBoardId(boards, currentBoardId, offset)
    if (!nextBoardId) return

    event.preventDefault()
    event.stopPropagation()
    openBoard(nextBoardId)
  }

  useHotkeys(
    [
      {
        hotkey: shortcuts.previousBoard ?? DEFAULT_SHORTCUT_SETTINGS.previousBoard,
        callback: event => switchBoard(-1, event),
        options: {
          enabled: shortcuts.previousBoard !== null,
          meta: {
            name: SHORTCUT_DEFINITIONS.previousBoard.label,
            description: SHORTCUT_DEFINITIONS.previousBoard.description,
          },
        },
      },
      {
        hotkey: shortcuts.nextBoard ?? DEFAULT_SHORTCUT_SETTINGS.nextBoard,
        callback: event => switchBoard(1, event),
        options: {
          enabled: shortcuts.nextBoard !== null,
          meta: {
            name: SHORTCUT_DEFINITIONS.nextBoard.label,
            description: SHORTCUT_DEFINITIONS.nextBoard.description,
          },
        },
      },
    ],
    {
      preventDefault: false,
      requireReset: true,
      stopPropagation: false,
    },
  )

  function handleCreate(board: Board): void {
    addBoard(board)
    openBoard(board.id)
  }

  function handleUpdate(board: Board): void {
    updateBoard(board)
  }

  function handleDelete(boardId: string): void {
    deleteBoard(boardId)
    openBoard(ALL_BOARD_ID)
  }

  return (
    <>
      <PillGroup className="max-w-[min(70vw,32rem)] overflow-x-auto scrollbar-hidden">
        {boards.map((board) => {
          const isActive = currentBoardId === board.id
          const isEditable = isActive && board.id !== ALL_BOARD_ID
          return (
            <Button
              key={board.id}
              data-board-tab=""
              type="button"
              variant="transparent"
              size="sm"
              onPointerEnter={event => event.currentTarget.toggleAttribute("data-editable", isEditable)}
              onPointerLeave={event => event.currentTarget.removeAttribute("data-editable")}
              onClick={() => {
                if (isEditable) {
                  setDialogTarget({ mode: "edit", boardId: board.id })
                  return
                }

                if (isActive) {
                  return
                }

                openBoard(board.id)
              }}
              className={cn(
                pillGroupItemClassName({ active: isActive }),
                "group/board-tab h-auto shrink-0",
              )}
              aria-current={isActive ? "page" : undefined}
              title={isEditable ? "Edit board" : undefined}
            >
              {isActive && (
                <PillGroupIndicator layoutId="active-board" />
              )}
              <span className="relative z-10">
                {board.name}
              </span>
              {isEditable && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-1 left-1/2 z-10 flex -translate-x-1/2 gap-[2px] opacity-0 group-data-[editable]/board-tab:opacity-80"
                >
                  <span className="size-[3px] rounded-full bg-current" />
                  <span className="size-[3px] rounded-full bg-current" />
                  <span className="size-[3px] rounded-full bg-current" />
                </span>
              )}
            </Button>
          )
        })}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setDialogTarget({ mode: "create" })}
          className="shrink-0 text-muted-foreground hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-theme-400"
          aria-label="Create board"
          title="Create board"
        >
          <PhPlusCircle />
        </Button>
      </PillGroup>
      {dialogTarget && (
        <BoardDialog
          boards={boards}
          currentBoardId={currentBoardId}
          target={dialogTarget}
          onClose={() => setDialogTarget(null)}
          onCreate={handleCreate}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
        />
      )}
    </>
  )
}
