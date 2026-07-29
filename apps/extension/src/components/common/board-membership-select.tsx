import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@newsnext/ui/components/select"
import { useAtomValue } from "jotai"
import { DEFAULT_BOARD_ID, INBOX_ONLY_VALUE } from "@/lib/boards"
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
  const customBoards = boards.filter(board => board.id !== DEFAULT_BOARD_ID)
  const selectedLabel = value === null
    ? "Inbox only"
    : customBoards.find(board => board.id === value)!.name

  return (
    <Select
      value={value ?? INBOX_ONLY_VALUE}
      onValueChange={(nextValue) => {
        if (nextValue) {
          onValueChange(nextValue === INBOX_ONLY_VALUE ? null : nextValue)
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
        <SelectItem value={INBOX_ONLY_VALUE}>Inbox only</SelectItem>
        {customBoards.map(board => (
          <SelectItem key={board.id} value={board.id}>{board.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
