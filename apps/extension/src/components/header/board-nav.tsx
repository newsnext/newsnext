import type { Color } from "@newsnext/shared/types"
import type { BoardSortMode } from "@/lib/board-sorting"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@newsnext/ui/components/alert-dialog"
import { Button } from "@newsnext/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@newsnext/ui/components/dialog"
import { Input } from "@newsnext/ui/components/input"
import { RadioGroup, RadioGroupItem } from "@newsnext/ui/components/radio-group"
import { useNavigate } from "@tanstack/react-router"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { m } from "motion/react"
import { useState } from "react"
import { ThemeSelector } from "@/components/common/theme-selector"
import { PhPlusCircleDuotone, PhTrashDuotone } from "@/components/icons/ph"
import { getBoardSortPreference } from "@/lib/board-sorting"
import { ALL_BOARD_ID, createBoard, getBoardColor, getBoardDisplayName, isBoardNameTaken } from "@/lib/boards"
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

const SORT_OPTIONS: { label: string, value: BoardSortMode }[] = [
  { label: "Manual", value: "manual" },
  { label: "Date added", value: "createdAt" },
  { label: "Provider name", value: "provider" },
]

function BoardEditDialog({
  boardId,
  onClose,
}: {
  boardId: string
  onClose: () => void
}) {
  const boards = useAtomValue(boardsAtom)
  const preferences = useAtomValue(boardSortPreferencesAtom)
  const navigate = useNavigate()
  const updateBoard = useSetAtom(updateBoardAtom)
  const deleteBoard = useSetAtom(deleteBoardAtom)
  const setBoardSortMode = useSetAtom(setBoardSortModeAtom)
  const board = boards.find(candidate => candidate.id === boardId)
  const preference = getBoardSortPreference(preferences, boardId)
  const isAllBoard = boardId === ALL_BOARD_ID
  const [name, setName] = useState(() => board ? getBoardDisplayName(board) : "")
  const [color, setColor] = useState<Color>(() => board ? getBoardColor(board) : "red")
  const [sortMode, setSortMode] = useState<BoardSortMode>(preference.mode)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const normalizedName = name.trim()
  const hasDuplicateName = isBoardNameTaken(boards, normalizedName, boardId)
  const canSave = board !== undefined && (isAllBoard || normalizedName.length > 0) && !hasDuplicateName

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (!board || !canSave) {
      return
    }

    updateBoard({
      ...board,
      name: isAllBoard ? board.name : normalizedName,
      color,
    })
    setBoardSortMode({ boardId, mode: sortMode })
    onClose()
  }

  function handleDelete(): void {
    deleteBoard(boardId)
    onClose()
    void navigate({ to: "/board/$boardId", params: { boardId: ALL_BOARD_ID } })
  }

  return (
    <>
      <Dialog
        open
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            onClose()
          }
        }}
      >
        <DialogContent className="sm:max-w-lg" surfaceClassName="gap-5">
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Edit tab</DialogTitle>
              <DialogDescription>
                Personalize this board and choose how its cards are arranged.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-2">
              <label htmlFor="edit-board-name" className="text-sm font-medium">Name</label>
              <Input
                id="edit-board-name"
                autoFocus
                disabled={isAllBoard}
                maxLength={40}
                value={name}
                onChange={event => setName(event.target.value)}
                aria-invalid={hasDuplicateName}
              />
              {isAllBoard && <p className="text-xs text-muted-foreground">The All tab has a fixed name.</p>}
              {hasDuplicateName && <p className="text-xs text-destructive">A board with this name already exists.</p>}
            </div>

            <fieldset className="grid gap-3">
              <legend className="text-sm font-medium">Theme color</legend>
              <div className="mx-auto h-40 w-[300px] max-w-full rounded-2xl bg-foreground/3 p-2 ring-1 ring-foreground/5">
                <ThemeSelector
                  value={color}
                  onValueChange={setColor}
                  layoutId="board-edit-theme-indicator"
                />
              </div>
            </fieldset>

            <fieldset className="grid gap-3">
              <legend className="text-sm font-medium">Card order</legend>
              <RadioGroup
                value={sortMode}
                onValueChange={value => setSortMode(value as BoardSortMode)}
                className="grid gap-2 sm:grid-cols-3"
              >
                {SORT_OPTIONS.map(option => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 rounded-2xl bg-foreground/3 px-3 py-2.5 text-sm ring-1 ring-foreground/5 transition-colors hover:bg-foreground/6 hover:ring-foreground/15 has-[[data-checked]]:bg-primary/10 has-[[data-checked]]:ring-primary/30 has-[[data-checked]]:hover:bg-primary/15"
                  >
                    <RadioGroupItem value={option.value} />
                    {option.label}
                  </label>
                ))}
              </RadioGroup>
            </fieldset>

            <DialogFooter className={cn(!isAllBoard && "sm:justify-between")}>
              {!isAllBoard && (
                <Button type="button" variant="destructive" onClick={() => setIsDeleteOpen(true)}>
                  <PhTrashDuotone />
                  Delete tab
                </Button>
              )}
              <Button type="submit" disabled={!canSave}>Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {`Delete ${board ? getBoardDisplayName(board) : "this tab"}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              The tab will be removed. Its cards will remain available in All.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep tab</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>Delete tab</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function CreateBoardDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const boards = useAtomValue(boardsAtom)
  const navigate = useNavigate()
  const addBoard = useSetAtom(createBoardAtom)
  const currentBoardId = useAtomValue(currentBoardIdAtom)
  const setCurrentBoardId = useSetAtom(currentBoardIdAtom)
  const [name, setName] = useState("")
  const normalizedName = name.trim()
  const hasDuplicateName = isBoardNameTaken(boards, normalizedName)
  const canCreate = normalizedName.length > 0 && !hasDuplicateName

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (!canCreate) {
      return
    }

    const currentBoard = boards.find(board => board.id === currentBoardId)
    const board = createBoard(normalizedName, currentBoard ? getBoardColor(currentBoard) : undefined)
    addBoard(board)
    setCurrentBoardId(board.id)
    void navigate({ to: "/board/$boardId", params: { boardId: board.id } })
    setName("")
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setName("")
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent>
        <form className="grid gap-6" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create board</DialogTitle>
            <DialogDescription>
              Group cards around a topic, project, or reading routine.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="board-name" className="text-sm font-medium">Board name</label>
            <Input
              id="board-name"
              autoFocus
              maxLength={40}
              placeholder="Product signals"
              value={name}
              onChange={event => setName(event.target.value)}
              aria-invalid={hasDuplicateName}
            />
            {hasDuplicateName && (
              <p className="text-xs text-destructive">A board with this name already exists.</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!canCreate}>Create board</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function BoardNav() {
  const boards = useAtomValue(boardsAtom)
  const navigate = useNavigate()
  const [currentBoardId, setCurrentBoardId] = useAtom(currentBoardIdAtom)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null)

  return (
    <>
      <div className="island-pill flex max-w-[min(70vw,32rem)] items-center gap-1 overflow-x-auto rounded-full p-1 scrollbar-hidden">
        {boards.map((board) => {
          const isActive = currentBoardId === board.id
          return (
            <m.button
              key={board.id}
              type="button"
              whileTap={isActive ? { scale: 0.94 } : undefined}
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
              onPointerEnter={event => event.currentTarget.toggleAttribute("data-editable", isActive)}
              onPointerLeave={event => event.currentTarget.removeAttribute("data-editable")}
              onClick={() => {
                if (isActive) {
                  setEditingBoardId(board.id)
                  return
                }

                setCurrentBoardId(board.id)
                void navigate({ to: "/board/$boardId", params: { boardId: board.id } })
              }}
              className={cn(
                "group/board-tab relative shrink-0 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-theme-400",
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
            </m.button>
          )
        })}
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-lg text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-theme-400"
          aria-label="Create board"
          title="Create board"
        >
          <PhPlusCircleDuotone />
        </button>
      </div>
      <CreateBoardDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      {editingBoardId && (
        <BoardEditDialog
          boardId={editingBoardId}
          onClose={() => setEditingBoardId(null)}
        />
      )}
    </>
  )
}
