import type { BoardDialogTarget } from "@/components/board-dialog"
import type { Board } from "@/lib/boards"
import { Button } from "@newsnext/ui/components/button"
import {
  PillGroup,
  PillGroupIndicator,
  pillGroupItemClassName,
} from "@newsnext/ui/components/pill-group"
import { useNavigate } from "@tanstack/react-router"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { useState } from "react"
import { BoardDialog } from "@/components/board-dialog"
import { PhPlusCircleDuotone } from "@/components/icons/ph"
import { ALL_BOARD_ID } from "@/lib/boards"
import { cn } from "@/lib/utils"
import {
  boardsAtom,
  createBoardAtom,
  deleteBoardAtom,
  updateBoardAtom,
} from "@/store/board"
import { currentBoardIdAtom } from "@/store/settings"

export function BoardNav() {
  const boards = useAtomValue(boardsAtom)
  const navigate = useNavigate()
  const [currentBoardId, setCurrentBoardId] = useAtom(currentBoardIdAtom)
  const addBoard = useSetAtom(createBoardAtom)
  const updateBoard = useSetAtom(updateBoardAtom)
  const deleteBoard = useSetAtom(deleteBoardAtom)
  const [dialogTarget, setDialogTarget] = useState<BoardDialogTarget | null>(null)

  function handleCreate(board: Board): void {
    addBoard(board)
    setCurrentBoardId(board.id)
    void navigate({ to: "/board/$boardId", params: { boardId: board.id } })
  }

  function handleUpdate(board: Board): void {
    updateBoard(board)
  }

  function handleDelete(boardId: string): void {
    deleteBoard(boardId)
    void navigate({ to: "/board/$boardId", params: { boardId: ALL_BOARD_ID } })
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

                setCurrentBoardId(board.id)
                void navigate({ to: "/board/$boardId", params: { boardId: board.id } })
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
          <PhPlusCircleDuotone />
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
