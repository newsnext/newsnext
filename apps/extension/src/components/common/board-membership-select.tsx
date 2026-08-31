import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@newsnext/ui/components/dropdown-menu"
import { useAtomValue } from "jotai"
import { useI18n } from "@/hooks/use-i18n"
import { cn } from "@/lib/utils"
import { boardsAtom } from "@/store/board"

interface BoardMembershipSelectProps {
  value: readonly string[]
  onMembershipChange: (boardId: string, member: boolean) => void
  ariaLabel: string
  align?: "start" | "center" | "end"
  className?: string
  isBoardDisabled?: (boardId: string) => boolean
}

export function BoardMembershipSelect({
  value,
  onMembershipChange,
  ariaLabel,
  align = "end",
  className,
  isBoardDisabled,
}: BoardMembershipSelectProps): React.JSX.Element {
  const { t } = useI18n()
  const boards = useAtomValue(boardsAtom)
  const selectedBoardIds = new Set(value)
  const selectedBoards = boards.filter(board => selectedBoardIds.has(board.id))
  const label = selectedBoards.length === 0
    ? t("noBoards")
    : selectedBoards.length === 1
      ? selectedBoards[0]!.name
      : t("boardCount", { count: selectedBoards.length })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex h-8 max-w-48 items-center rounded-3xl bg-background/45 px-3 text-sm outline-none ring-1 ring-foreground/10 hover:bg-background/60 focus-visible:ring-2 focus-visible:ring-theme-400",
          className,
        )}
        onClick={event => event.stopPropagation()}
        aria-label={ariaLabel}
      >
        <span className="truncate">{label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} onClick={event => event.stopPropagation()}>
        {boards.length === 0
          ? <DropdownMenuItem disabled>{t("noBoardsAvailable")}</DropdownMenuItem>
          : boards.map(board => (
              <DropdownMenuCheckboxItem
                key={board.id}
                checked={selectedBoardIds.has(board.id)}
                closeOnClick={false}
                disabled={isBoardDisabled?.(board.id)
                  || (selectedBoardIds.has(board.id) && selectedBoardIds.size === 1)}
                title={selectedBoardIds.has(board.id) && selectedBoardIds.size === 1
                  ? t("liveCardNeedsBoard")
                  : undefined}
                onCheckedChange={member => onMembershipChange(board.id, member)}
              >
                {board.name}
              </DropdownMenuCheckboxItem>
            ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
