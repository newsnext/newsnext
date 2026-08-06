import type { Color } from "@newsnext/shared/types"
import type { BoardFilterMode } from "@/lib/board-filter"
import type { BoardSortMode } from "@/lib/board-sorting"
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
import { createBoardFilter } from "@/lib/board-filter"
import { DEFAULT_BOARD_SORT_PREFERENCE, updateBoardSortMode } from "@/lib/board-sorting"
import {
  ALL_BOARD_ID,
  createBoard,
  DEFAULT_BOARD_COLOR,
  getBoardColor,
  isBoardNameTaken,
} from "@/lib/boards"
import { cn } from "@/lib/utils"

const SORT_OPTIONS: { label: string, value: BoardSortMode }[] = [
  { label: "Manual", value: "manual" },
  { label: "Date added", value: "createdAt" },
  { label: "Provider name", value: "provider" },
]

const FILTER_OPTIONS: { label: string, value: BoardFilterMode }[] = [
  { label: "Show matches", value: "include" },
  { label: "Hide matches", value: "exclude" },
]

export type BoardDialogTarget
  = | { mode: "create" }
    | { mode: "edit", boardId: string }

interface BoardDialogProps {
  boards: Board[]
  currentBoardId: string
  target: BoardDialogTarget
  onClose: () => void
  onCreate: (board: Board) => void
  onDelete: (boardId: string) => void
  onUpdate: (board: Board) => void
}

export function BoardDialog(props: BoardDialogProps) {
  if (props.target.mode === "edit" && props.target.boardId === ALL_BOARD_ID) {
    return null
  }

  return <ConfigurableBoardDialog {...props} />
}

function ConfigurableBoardDialog({
  boards,
  currentBoardId,
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
  const initialSortMode = board?.sort.mode ?? DEFAULT_BOARD_SORT_PREFERENCE.mode
  const initialFilterMode = board?.filter?.mode ?? "include"
  const initialFilterKeywords = board?.filter?.keywords.join(", ") ?? ""
  const [name, setName] = useState(() => board?.name ?? "")
  const [color, setColor] = useState<Color>(initialColor)
  const [sortMode, setSortMode] = useState<BoardSortMode>(initialSortMode)
  const [filterMode, setFilterMode] = useState<BoardFilterMode>(initialFilterMode)
  const [filterKeywords, setFilterKeywords] = useState(initialFilterKeywords)
  const [isDeleteArmed, setIsDeleteArmed] = useState(false)
  const normalizedName = name.trim()
  const hasDuplicateName = isBoardNameTaken(boards, normalizedName, boardId)
  const canSubmit = (!isEditing || board !== undefined)
    && normalizedName.length > 0
    && !hasDuplicateName

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (!canSubmit) {
      return
    }
    const filter = createBoardFilter(filterMode, filterKeywords)

    if (isEditing) {
      if (!board) {
        return
      }

      const nextBoard: Board = {
        ...board,
        name: normalizedName,
        color,
        sort: updateBoardSortMode(board.sort, sortMode),
      }
      if (filter) {
        nextBoard.filter = filter
      } else {
        delete nextBoard.filter
      }
      onUpdate(nextBoard)
      onClose()
      return
    }

    onCreate(createBoard(
      normalizedName,
      color,
      sortMode,
      filter,
    ))
    onClose()
  }

  function handleDelete(): void {
    if (!boardId) {
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
        surfaceClassName={cn(initialColor, "gap-0")}
      >
        <form className="grid" onSubmit={handleSubmit}>
          <DialogHeader className="h-10 justify-center px-2">
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
                maxLength={40}
                placeholder={isEditing ? undefined : "Product signals"}
                value={name}
                onChange={event => setName(event.target.value)}
                aria-invalid={hasDuplicateName}
              />
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
                className="w-full"
              >
                {SORT_OPTIONS.map(option => (
                  <RadioGroupItem key={option.value} value={option.value} className="min-w-0 flex-1 px-2">
                    {option.label}
                  </RadioGroupItem>
                ))}
              </RadioGroup>
            </fieldset>

            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">Item filter</legend>
              <RadioGroup
                variant="segmented"
                value={filterMode}
                onValueChange={setFilterMode}
                className="w-full"
              >
                {FILTER_OPTIONS.map(option => (
                  <RadioGroupItem key={option.value} value={option.value} className="min-w-0 flex-1 px-2">
                    {option.label}
                  </RadioGroupItem>
                ))}
              </RadioGroup>
              <label htmlFor="board-filter-keywords" className="sr-only">Keywords</label>
              <Input
                id="board-filter-keywords"
                maxLength={500}
                placeholder="AI, browser, crypto"
                value={filterKeywords}
                onChange={event => setFilterKeywords(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Separate keywords with commas. Matches titles and inline text.
              </p>
            </fieldset>

            <DialogFooter className={cn(isEditing && "sm:justify-between")}>
              {isEditing && (
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
              <Button type="submit" disabled={!canSubmit}>
                {isEditing ? "Save changes" : "Create board"}
              </Button>
            </DialogFooter>
          </SquircleBox>
        </form>
      </DialogContent>
    </Dialog>
  )
}
