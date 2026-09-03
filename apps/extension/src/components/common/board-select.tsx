import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@newsnext/ui/components/dropdown-menu"
import { useAtomValue } from "jotai"
import { useI18n } from "@/hooks/use-i18n"
import { cn } from "@/lib/utils"
import { boardsAtom } from "@/store/board"

interface BoardSelectProps {
  value: string | undefined
  onValueChange: (boardId: string) => void
  ariaLabel: string
  align?: "start" | "center" | "end"
  className?: string
  isBoardDisabled?: (boardId: string) => boolean
}

export function BoardSelect({
  value,
  onValueChange,
  ariaLabel,
  align = "end",
  className,
  isBoardDisabled,
}: BoardSelectProps): React.JSX.Element {
  const { t } = useI18n()
  const boards = useAtomValue(boardsAtom)
  const selectedBoard = boards.find(board => board.id === value)
  const label = selectedBoard?.name ?? t("noBoards")

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
          : (
              <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
                {boards.map(board => (
                  <DropdownMenuRadioItem
                    key={board.id}
                    value={board.id}
                    disabled={isBoardDisabled?.(board.id)}
                  >
                    {board.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
