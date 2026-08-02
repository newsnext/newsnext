import type { Color } from "@newsnext/shared/types"
import type { BoardSortMode, BoardSortPreference } from "@/lib/board-sorting"
import type { Board } from "@/lib/boards"
import { Button } from "@newsnext/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@newsnext/ui/components/dialog"
import { Input } from "@newsnext/ui/components/input"
import { RadioGroup, RadioGroupItem } from "@newsnext/ui/components/radio-group"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { ThemeSelector } from "@newsnext/ui/components/theme-selector"
import { useState } from "react"
import { PhCheckCircleDuotone, PhTrashDuotone } from "@/components/icons/ph"
import { DEFAULT_BOARD_SORT_PREFERENCE, getBoardSortPreference } from "@/lib/board-sorting"
import {
  ALL_BOARD_ID,
  createBoard,
  DEFAULT_BOARD_COLOR,
  getBoardColor,
  getBoardDisplayName,
  isBoardNameTaken,
} from "@/lib/boards"
import { cn } from "@/lib/utils"

const SORT_OPTIONS: { label: string, value: BoardSortMode }[] = [
  { label: "Manual", value: "manual" },
  { label: "Date added", value: "createdAt" },
  { label: "Provider name", value: "provider" },
]

export type BoardDialogTarget
  = | { mode: "create" }
    | { mode: "edit", boardId: string }

interface BoardDialogProps {
  boards: Board[]
  currentBoardId: string
  preferences: Record<string, BoardSortPreference>
  target: BoardDialogTarget
  onClose: () => void
  onCreate: (board: Board, sortMode: BoardSortMode) => void
  onDelete: (boardId: string) => void
  onUpdate: (board: Board, sortMode: BoardSortMode) => void
}

export function BoardDialog({
  boards,
  currentBoardId,
  preferences,
  target,
  onClose,
  onCreate,
  onDelete,
  onUpdate,
}: BoardDialogProps) {
  const isEditing = target.mode === "edit"
  const boardId = isEditing ? target.boardId : undefined
  const board = boardId ? boards.find(candidate => candidate.id === boardId) : undefined
  const currentBoard = boards.find(candidate => candidate.id === currentBoardId)
  const initialColor = board
    ? getBoardColor(board)
    : currentBoard
      ? getBoardColor(currentBoard)
      : DEFAULT_BOARD_COLOR
  const initialSortMode = boardId
    ? getBoardSortPreference(preferences, boardId).mode
    : DEFAULT_BOARD_SORT_PREFERENCE.mode
  const isAllBoard = boardId === ALL_BOARD_ID
  const [name, setName] = useState(() => board ? getBoardDisplayName(board) : "")
  const [color, setColor] = useState<Color>(initialColor)
  const [sortMode, setSortMode] = useState<BoardSortMode>(initialSortMode)
  const [isDeleteArmed, setIsDeleteArmed] = useState(false)
  const normalizedName = name.trim()
  const hasDuplicateName = isBoardNameTaken(boards, normalizedName, boardId)
  const canSubmit = (!isEditing || board !== undefined)
    && (isAllBoard || normalizedName.length > 0)
    && !hasDuplicateName

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (!canSubmit) {
      return
    }

    if (isEditing) {
      if (!board) {
        return
      }

      onUpdate({
        ...board,
        name: isAllBoard ? board.name : normalizedName,
        color,
      }, sortMode)
      onClose()
      return
    }

    onCreate(createBoard(normalizedName, color), sortMode)
    onClose()
  }

  function handleDelete(): void {
    if (!boardId || isAllBoard) {
      return
    }

    onDelete(boardId)
    onClose()
  }

  return (
    <Dialog
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose()
        }
      }}
    >
      <DialogContent
        variant="themed"
        className="sm:max-w-lg"
        surfaceClassName={cn(initialColor, "gap-0 ring-0")}
      >
        <form className="grid" onSubmit={handleSubmit}>
          <DialogHeader className="h-10 justify-center px-2 pr-12">
            <DialogTitle className="font-bold">
              {isEditing ? "Edit board" : "Create board"}
            </DialogTitle>
          </DialogHeader>

          <SquircleBox radius="2xl" variant="modal-inner" className="grid gap-6 p-6">
            <div className="grid gap-2">
              <label htmlFor="board-name" className="text-sm font-medium">Name</label>
              <Input
                id="board-name"
                autoFocus
                disabled={isAllBoard}
                maxLength={40}
                placeholder={isEditing ? undefined : "Product signals"}
                value={name}
                onChange={event => setName(event.target.value)}
                aria-invalid={hasDuplicateName}
              />
              {isAllBoard && <p className="text-xs text-muted-foreground">The All board has a fixed name.</p>}
              {hasDuplicateName && <p className="text-xs text-destructive">A board with this name already exists.</p>}
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-medium">Theme color</legend>
              <div className="h-28">
                <ThemeSelector
                  value={color}
                  onValueChange={setColor}
                  layoutId="board-dialog-theme-indicator"
                />
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-medium">Card order</legend>
              <RadioGroup
                variant="segmented"
                value={sortMode}
                onValueChange={setSortMode}
                className="w-full gap-1"
              >
                {SORT_OPTIONS.map(option => (
                  <RadioGroupItem key={option.value} value={option.value} className="min-w-0 flex-1 px-2">
                    {option.label}
                  </RadioGroupItem>
                ))}
              </RadioGroup>
            </fieldset>

            <DialogFooter className={cn(isEditing && !isAllBoard && "sm:justify-between")}>
              {isEditing && !isAllBoard && (
                <Button
                  type="button"
                  variant="destructive"
                  onBlur={() => setIsDeleteArmed(false)}
                  onClick={() => {
                    if (isDeleteArmed) {
                      handleDelete()
                      return
                    }
                    setIsDeleteArmed(true)
                  }}
                >
                  {isDeleteArmed ? <PhCheckCircleDuotone /> : <PhTrashDuotone />}
                  <span aria-live="polite">
                    {isDeleteArmed ? "Confirm delete" : "Delete board"}
                  </span>
                </Button>
              )}
              <Button type="submit" className="text-white" disabled={!canSubmit}>
                {isEditing ? "Save changes" : "Create board"}
              </Button>
            </DialogFooter>
          </SquircleBox>
        </form>
      </DialogContent>
    </Dialog>
  )
}
