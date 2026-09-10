import { useAtomValue } from "jotai"
import { CardBoardSelect } from "@/components/live-card/card-back/board-select"
import { DeleteCardButton } from "@/components/live-card/card-back/delete-card-button"
import { useI18n } from "@/hooks/use-i18n"
import { actions } from "@/lib/actions"
import { boardsAtom } from "@/store/board"

export function DeleteWidgetButton({ boardId, widgetId }: { boardId: string, widgetId: string }): React.JSX.Element {
  const { t } = useI18n()
  return (
    <DeleteCardButton
      label={t("removeWidget")}
      pendingLabel={t("removingWidget")}
      errorMessage={t("removeWidgetFailed")}
      onDelete={async () => {
        await actions.nextLayer.removeWidget({ boardId, widgetId })
      }}
    />
  )
}

export function WidgetBoardSelect({ boardId, widgetId }: { boardId: string, widgetId: string }): React.JSX.Element {
  const boards = useAtomValue(boardsAtom)
  return (
    <CardBoardSelect
      boardId={boardId}
      isBoardDisabled={id => id !== boardId && Boolean(boards.find(board => board.id === id)?.nextLayer.widgets.some(widget => widget.widgetId === widgetId))}
      onMove={async (targetBoardId) => {
        await actions.nextLayer.moveWidget({ boardId, targetBoardId, widgetId })
      }}
    />
  )
}
