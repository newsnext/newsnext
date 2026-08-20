import type { ChangeEvent } from "react"
import type { BoardDialogTarget } from "@/components/board-dialog"
import type { HeaderNotification } from "@/components/header/notification"
import type { Board, BoardCreateInput, BoardLayer } from "@/lib/board"
import { Button } from "@newsnext/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@newsnext/ui/components/dropdown-menu"
import {
  PillGroup,
  PillGroupIndicator,
  pillGroupItemClassName,
} from "@newsnext/ui/components/pill-group"
import { useHotkeys } from "@tanstack/react-hotkeys"
import { useNavigate } from "@tanstack/react-router"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { useRef, useState } from "react"
import { BoardDialog } from "@/components/board-dialog"
import { PhCircleDashed, PhFileArrowUp, PhPlusCircle } from "@/components/icons/ph"
import { ALL_BOARD_ID, DEFAULT_BOARD_LAYER, getAdjacentBoardId } from "@/lib/board"
import { OpmlImportError, parseOpml } from "@/lib/opml"
import { DEFAULT_SHORTCUT_SETTINGS, SHORTCUT_DEFINITIONS } from "@/lib/settings"
import { cn } from "@/lib/utils"
import {
  boardsAtom,
  createBoardAtom,
  createBoardFromOpmlAtom,
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

interface BoardNavProps {
  onNotify: (notification: HeaderNotification) => void
}

export function BoardNav({ onNotify }: BoardNavProps) {
  const boards = useAtomValue(boardsAtom)
  const navigate = useNavigate()
  const [currentBoardId, setCurrentBoardId] = useAtom(currentBoardIdAtom)
  const shortcuts = useAtomValue(shortcutSettingsAtom)
  const addBoard = useSetAtom(createBoardAtom)
  const addBoardFromOpml = useSetAtom(createBoardFromOpmlAtom)
  const updateBoard = useSetAtom(updateBoardAtom)
  const deleteBoard = useSetAtom(deleteBoardAtom)
  const [dialogTarget, setDialogTarget] = useState<BoardDialogTarget | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const opmlInputRef = useRef<HTMLInputElement>(null)

  function openBoard(boardId: string, layer?: BoardLayer): void {
    const targetLayer = layer
      ?? boards.find(board => board.id === boardId)?.defaultLayer
      ?? DEFAULT_BOARD_LAYER

    setCurrentBoardId(boardId)
    void navigate({
      to: "/board/$boardId",
      params: { boardId },
      state: state => ({ ...state, layer: targetLayer }),
    })
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

  async function handleCreate(input: BoardCreateInput): Promise<void> {
    const result = await addBoard(input)
    if (result?.collectionId) {
      openBoard(result.collectionId, input.defaultLayer)
    }
  }

  async function handleDelete(boardId: string, deleteLiveCards: boolean): Promise<void> {
    await deleteBoard({ boardId, deleteLiveCards })
    openBoard(ALL_BOARD_ID)
  }

  async function handleUpdate(board: Board): Promise<void> {
    await updateBoard(board)
    if (board.id !== currentBoardId) return

    await navigate({
      to: "/board/$boardId",
      params: { boardId: board.id },
      state: state => ({ ...state, layer: board.defaultLayer }),
      replace: true,
    })
  }

  async function handleOpmlImport(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return

    setIsImporting(true)
    try {
      const imported = parseOpml(await file.text())
      const result = await addBoardFromOpml(imported)
      if (result.collectionId) openBoard(result.collectionId)
    } catch (error) {
      onNotify({
        title: "Couldn’t import OPML",
        description: error instanceof OpmlImportError
          ? error.message
          : "NewsNext could not create the Board or import its RSS feeds.",
        tone: "error",
      })
    } finally {
      input.value = ""
      setIsImporting(false)
    }
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
              <span
                className="relative z-10 block max-w-8 truncate sm:max-w-16"
                title={board.name}
              >
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
        <DropdownMenu>
          <DropdownMenuTrigger
            render={(
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isImporting}
                className="shrink-0 text-muted-foreground hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-theme-400"
              />
            )}
            aria-label="Create board"
            title="Create board"
          >
            {isImporting ? <PhCircleDashed className="animate-spin" /> : <PhPlusCircle />}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem onClick={() => setDialogTarget({ mode: "create" })}>
              <PhPlusCircle />
              Create board
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => opmlInputRef.current?.click()}>
              <PhFileArrowUp />
              Create board from OPML
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          ref={opmlInputRef}
          type="file"
          accept=".opml,.xml,text/x-opml,text/xml,application/xml"
          className="sr-only"
          onChange={event => void handleOpmlImport(event)}
        />
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
