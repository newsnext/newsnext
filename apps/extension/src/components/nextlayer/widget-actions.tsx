import { CardBoardSelect } from "@/components/card-shell/settings/board-select"
import { DeleteCardButton } from "@/components/card-shell/settings/delete-card-button"
import { useI18n } from "@/hooks/use-i18n"
import { actions } from "@/lib/actions"

export function DeleteWidgetButton({ boardId, liveWidgetId }: { boardId: string, liveWidgetId: string }): React.JSX.Element {
  const { t } = useI18n()
  return (
    <DeleteCardButton
      label={t("removeLiveWidget")}
      pendingLabel={t("removingWidget")}
      errorMessage={t("removeLiveWidgetFailed")}
      onDelete={async () => {
        await actions.nextLayer.removeLiveWidget({ boardId, liveWidgetId })
      }}
    />
  )
}

export function WidgetBoardSelect({ boardId, liveWidgetId }: { boardId: string, liveWidgetId: string }): React.JSX.Element {
  return (
    <CardBoardSelect
      boardId={boardId}
      onMove={async (targetBoardId) => {
        await actions.nextLayer.moveLiveWidget({ boardId, targetBoardId, liveWidgetId })
      }}
    />
  )
}
