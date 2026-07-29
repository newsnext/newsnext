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
import { useNavigate } from "@tanstack/react-router"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { m } from "motion/react"
import { useState } from "react"
import { PhPlusCircleDuotone } from "@/components/icons/ph"
import { createBoard } from "@/lib/boards"
import { cn } from "@/lib/utils"
import { boardsAtom, createBoardAtom, currentBoardIdAtom } from "@/store/board"

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
  const setCurrentBoardId = useSetAtom(currentBoardIdAtom)
  const [name, setName] = useState("")
  const normalizedName = name.trim()
  const hasDuplicateName = boards.some(board =>
    board.name.localeCompare(normalizedName, undefined, { sensitivity: "accent" }) === 0)
  const canCreate = normalizedName.length > 0 && !hasDuplicateName

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (!canCreate) {
      return
    }

    const board = createBoard(normalizedName)
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

  return (
    <>
      <div className="island-pill flex max-w-[min(70vw,32rem)] items-center gap-1 overflow-x-auto rounded-full p-1 scrollbar-hidden">
        {boards.map((board) => {
          const isActive = currentBoardId === board.id
          return (
            <button
              key={board.id}
              type="button"
              onClick={() => {
                setCurrentBoardId(board.id)
                void navigate({ to: "/board/$boardId", params: { boardId: board.id } })
              }}
              className={cn(
                "relative shrink-0 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-theme-400",
                isActive ? "text-white" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {isActive && (
                <m.span
                  layoutId="active-board"
                  className="absolute inset-0 rounded-full bg-theme-500 shadow-md"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{board.name}</span>
            </button>
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
    </>
  )
}
