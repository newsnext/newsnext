import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@newsnext/ui/components/select"
import { useAtomValue } from "jotai"
import { ALL_BOARD_ID, NO_BOARD_VALUE } from "@/lib/boards"
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
  const selectedLabel = value === null
    ? "No board"
    : customBoards.find(board => board.id === value)!.name

  return (
    <Select
      value={value ?? NO_BOARD_VALUE}
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
