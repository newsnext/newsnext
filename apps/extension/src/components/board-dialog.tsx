import type { Color } from "@newsnext/shared/types"
import type { Board, BoardCreateInput, BoardLayer, BoardSortMode } from "@/lib/board"
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
import { ConfigSection } from "@/components/common/config-section"
import { ConfirmDestructiveButton } from "@/components/common/confirm-destructive-button"
import { useAsyncAction } from "@/hooks/use-async-action"
import { ALL_BOARD_ID, DEFAULT_BOARD_COLOR, DEFAULT_BOARD_LAYER, DEFAULT_BOARD_SORT_PREFERENCE, getBoardColor, updateBoardSortMode } from "@/lib/board"
import { cn } from "@/lib/utils"

const SORT_OPTIONS: { label: string, value: BoardSortMode }[] = [
  { label: "Manual", value: "manual" },
  { label: "Date added", value: "createdAt" },
  { label: "Provider name", value: "provider" },
]

const LAYER_OPTIONS: { label: string, value: BoardLayer }[] = [
  { label: "Now", value: "now" },
  { label: "Next", value: "next" },
]

const DELETE_OPTIONS = [
  {
    confirmLabel: "Confirm delete",
    deleteLiveCards: false,
    label: "Delete board",
  },
  {
    confirmLabel: "Confirm with LiveCards",
    deleteLiveCards: true,
    label: "Delete with LiveCards",
  },
] as const

export type BoardDialogTarget
  = | { mode: "create" }
    | { mode: "edit", boardId: string }

interface BoardDialogProps {
  boards: Board[]
  currentBoardId: string
  target: BoardDialogTarget
  onClose: () => void
  onCreate: (input: BoardCreateInput) => Promise<void> | void
  onDelete: (boardId: string, deleteLiveCards: boolean) => Promise<void> | void
  onUpdate: (board: Board) => Promise<void> | void
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
  const initialDefaultLayer = board?.defaultLayer ?? DEFAULT_BOARD_LAYER
  const [name, setName] = useState(() => board?.name ?? "")
  const [color, setColor] = useState<Color>(initialColor)
  const [sortMode, setSortMode] = useState<BoardSortMode>(initialSortMode)
  const [defaultLayer, setDefaultLayer] = useState<BoardLayer>(initialDefaultLayer)
  const { error: submitError, isPending: isSubmitting, run: runAction } = useAsyncAction(
    "The board could not be saved.",
  )
  const normalizedName = name.trim()
  const canSubmit = (!isEditing || board !== undefined)
    && normalizedName.length > 0

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!canSubmit) {
      return
    }
    if (isEditing) {
      if (!board) return
      const succeeded = await runAction(async () => {
        const nextBoard: Board = {
          ...board,
          name: normalizedName,
          color,
          defaultLayer,
          sort: updateBoardSortMode(board.sort, sortMode),
        }
        await onUpdate(nextBoard)
      })
      if (succeeded) onClose()
      return
    }

    const succeeded = await runAction(async () => {
      await onCreate({
        name: normalizedName,
        color,
        defaultLayer,
        sortMode,
      })
    })
    if (succeeded) onClose()
  }

  async function handleDelete(deleteLiveCards: boolean): Promise<void> {
    if (!boardId) {
      return
    }

    const succeeded = await runAction(async () => {
      await onDelete(boardId, deleteLiveCards)
    }, "The board could not be deleted.")
    if (succeeded) onClose()
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
            <ConfigSection variant="field" title="Name" htmlFor="board-name">
              <Input
                id="board-name"
                autoFocus
                placeholder={isEditing ? undefined : "Product signals"}
                value={name}
                onChange={event => setName(event.target.value)}
              />
            </ConfigSection>

            <ConfigSection variant="group" title="Theme color">
              <div className="h-28">
                <ThemeSelector
                  value={color}
                  onValueChange={setColor}
                  layoutId="board-dialog-theme-indicator"
                />
              </div>
            </ConfigSection>

            <ConfigSection variant="group" title="LiveCard order">
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
            </ConfigSection>

            <ConfigSection
              variant="group"
              title="Default layer"
              description="Choose which layer opens with this board. The layer shortcut updates this setting too."
            >
              <RadioGroup
                variant="segmented"
                value={defaultLayer}
                onValueChange={setDefaultLayer}
                className="w-full"
              >
                {LAYER_OPTIONS.map(option => (
                  <RadioGroupItem key={option.value} value={option.value} className="min-w-0 flex-1 px-2">
                    {option.label}
                  </RadioGroupItem>
                ))}
              </RadioGroup>
            </ConfigSection>

            <DialogFooter className={cn(isEditing && "sm:justify-between")}>
              {isEditing && (
                <div className="flex flex-wrap gap-2">
                  {DELETE_OPTIONS.map(option => (
                    <ConfirmDestructiveButton
                      key={option.label}
                      type="button"
                      disabled={isSubmitting}
                      label={option.label}
                      confirmLabel={option.confirmLabel}
                      pending={isSubmitting}
                      pendingLabel="Deleting…"
                      onConfirm={() => handleDelete(option.deleteLiveCards)}
                    />
                  ))}
                </div>
              )}
              <Button type="submit" disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Saving…" : isEditing ? "Save changes" : "Create board"}
              </Button>
            </DialogFooter>
            {submitError && (
              <p role="alert" className="text-sm text-destructive">{submitError}</p>
            )}
          </SquircleBox>
        </form>
      </DialogContent>
    </Dialog>
  )
}
