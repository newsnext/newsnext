import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@newsnext/ui/components/select"
import { useAtomValue } from "jotai"
import { ALL_BOARD_ID, NO_BOARD_VALUE } from "@/lib/board"
import { cn } from "@/lib/utils"
import { boardsAtom } from "@/store/board"

interface BoardMembershipSelectProps {
  value: string | null
  onValueChange: (boardId: string | null) => void
  ariaLabel: string
  align?: "start" | "center" | "end"
  className?: string
}

export function BoardMembershipSelect({
  value,
  onValueChange,
  ariaLabel,
  align = "end",
  className,
}: BoardMembershipSelectProps) {
  const boards = useAtomValue(boardsAtom)
  const customBoards = boards.filter(board => board.id !== ALL_BOARD_ID)
  const selectedBoard = value === null
    ? undefined
    : customBoards.find(board => board.id === value)
  const selectedValue = selectedBoard?.id ?? NO_BOARD_VALUE
  const selectedLabel = selectedBoard?.name ?? "No board"

  return (
    <Select
      value={selectedValue}
      onValueChange={(nextValue) => {
        if (nextValue) {
          onValueChange(nextValue === NO_BOARD_VALUE ? null : nextValue)
        }
      }}
    >
      <SelectTrigger
        size="sm"
        className={cn("max-w-48", className)}
        onClick={event => event.stopPropagation()}
        aria-label={ariaLabel}
      >
        <span className="flex-1 truncate text-left">{selectedLabel}</span>
      </SelectTrigger>
      <SelectContent align={align}>
        <SelectItem value={NO_BOARD_VALUE}>No board</SelectItem>
        {customBoards.map(board => (
          <SelectItem key={board.id} value={board.id}>{board.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
