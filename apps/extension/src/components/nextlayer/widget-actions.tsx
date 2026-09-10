import { useAtomValue } from "jotai"
import { CardBoardSelect } from "@/components/card-shell/settings/board-select"
import { DeleteCardButton } from "@/components/card-shell/settings/delete-card-button"
import { useI18n } from "@/hooks/use-i18n"
import { actions } from "@/lib/actions"
import { boardsAtom } from "@/store/board"

export function DeleteWidgetButton({ boardId, widgetId }: { boardId: string, widgetId: string }): React.JSX.Element {
  const { t } = useI18n()
  return (
    <DeleteCardButton
      label={t("removeLiveWidget")}
      pendingLabel={t("removingWidget")}
      errorMessage={t("removeLiveWidgetFailed")}
      onDelete={async () => {
        await actions.nextLayer.removeLiveWidget({ boardId, widgetId })
      }}
    />
  )
}

export function WidgetBoardSelect({ boardId, widgetId }: { boardId: string, widgetId: string }): React.JSX.Element {
  const boards = useAtomValue(boardsAtom)
  return (
    <CardBoardSelect
      boardId={boardId}
      isBoardDisabled={id => id !== boardId && Boolean(boards.find(board => board.id === id)?.nextLayer.liveWidgets.some(widget => widget.widgetId === widgetId))}
      onMove={async (targetBoardId) => {
        await actions.nextLayer.moveLiveWidget({ boardId, targetBoardId, widgetId })
      }}
    />
  )
}
