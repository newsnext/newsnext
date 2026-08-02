import type { BoardDialogTarget } from "@/components/board-dialog"
import type { BoardSortMode } from "@/lib/board-sorting"
import type { Board } from "@/lib/boards"
import { Button } from "@newsnext/ui/components/button"
import { useNavigate } from "@tanstack/react-router"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { m } from "motion/react"
import { useState } from "react"
import { BoardDialog } from "@/components/board-dialog"
import { PhPlusCircleDuotone } from "@/components/icons/ph"
import { ALL_BOARD_ID, getBoardDisplayName } from "@/lib/boards"
import { cn } from "@/lib/utils"
import {
  boardsAtom,
  boardSortPreferencesAtom,
  createBoardAtom,
  currentBoardIdAtom,
  deleteBoardAtom,
  setBoardSortModeAtom,
  updateBoardAtom,
} from "@/store/board"

export function BoardNav() {
  const boards = useAtomValue(boardsAtom)
  const navigate = useNavigate()
  const [currentBoardId, setCurrentBoardId] = useAtom(currentBoardIdAtom)
  const preferences = useAtomValue(boardSortPreferencesAtom)
  const addBoard = useSetAtom(createBoardAtom)
  const updateBoard = useSetAtom(updateBoardAtom)
  const deleteBoard = useSetAtom(deleteBoardAtom)
  const setBoardSortMode = useSetAtom(setBoardSortModeAtom)
  const [dialogTarget, setDialogTarget] = useState<BoardDialogTarget | null>(null)

  function handleCreate(board: Board, sortMode: BoardSortMode): void {
    addBoard(board)
    setBoardSortMode({ boardId: board.id, mode: sortMode })
    setCurrentBoardId(board.id)
    void navigate({ to: "/board/$boardId", params: { boardId: board.id } })
  }

  function handleUpdate(board: Board, sortMode: BoardSortMode): void {
    updateBoard(board)
    setBoardSortMode({ boardId: board.id, mode: sortMode })
  }

  function handleDelete(boardId: string): void {
    deleteBoard(boardId)
    void navigate({ to: "/board/$boardId", params: { boardId: ALL_BOARD_ID } })
  }

  return (
    <>
      <div className="island-pill flex max-w-[min(70vw,32rem)] items-center gap-1 overflow-x-auto rounded-full p-1 scrollbar-hidden">
        {boards.map((board) => {
          const isActive = currentBoardId === board.id
          return (
            <Button
              render={(
                <m.button
                  whileTap={isActive ? { scale: 0.94 } : undefined}
                  transition={{ type: "spring", stiffness: 500, damping: 28 }}
                />
              )}
              key={board.id}
              type="button"
              variant="transparent"
              size="sm"
              onPointerEnter={event => event.currentTarget.toggleAttribute("data-editable", isActive)}
              onPointerLeave={event => event.currentTarget.removeAttribute("data-editable")}
              onClick={() => {
                if (isActive) {
                  setDialogTarget({ mode: "edit", boardId: board.id })
                  return
                }

                setCurrentBoardId(board.id)
                void navigate({ to: "/board/$boardId", params: { boardId: board.id } })
              }}
              className={cn(
                "group/board-tab relative h-auto shrink-0 px-3 py-1.5 focus-visible:ring-2 focus-visible:ring-theme-400",
                isActive ? "text-white" : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
              title={isActive ? "Edit tab" : undefined}
            >
              {isActive && (
                <m.span
                  layoutId="active-board"
                  className="absolute inset-0 rounded-full bg-theme-500 shadow-md"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">
                {getBoardDisplayName(board)}
              </span>
              {isActive && (
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
          <PhPlusCircleDuotone />
        </Button>
      </div>
      {dialogTarget && (
        <BoardDialog
          boards={boards}
          currentBoardId={currentBoardId}
          preferences={preferences}
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
