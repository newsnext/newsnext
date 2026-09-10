import { BoardSelect } from "@/components/common/board-select"
import { useAsyncAction } from "@/hooks/use-async-action"
import { useI18n } from "@/hooks/use-i18n"

export function CardBoardSelect({ boardId, onMove, isBoardDisabled }: {
  boardId?: string
  onMove: (boardId: string) => Promise<void>
  isBoardDisabled?: (boardId: string) => boolean
}): React.JSX.Element {
  const { t } = useI18n()
  const { error, isPending, run } = useAsyncAction(t("moveCardFailed"))
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm font-semibold opacity-80">{t("boards")}</span>
      <BoardSelect
        value={boardId}
        className="max-w-full"
        onValueChange={(id) => {
          if (boardId && id !== boardId) void run(() => onMove(id))
        }}
        ariaLabel={t("moveCardToBoard")}
        isBoardDisabled={id => isPending || Boolean(isBoardDisabled?.(id))}
      />
      {error && <span role="alert" className="text-sm text-destructive">{error}</span>}
    </div>
  )
}
