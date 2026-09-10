import { useAtomValue, useSetAtom } from "jotai"
import { CardBoardSelect } from "@/components/card-shell/settings/board-select"
import { DeleteCardButton } from "@/components/card-shell/settings/delete-card-button"
import { useI18n } from "@/hooks/use-i18n"
import {
  boardsAtom,
  deleteLiveCardAtom,
  moveLiveCardAtom,
} from "@/store/board"

export function LiveCardBoardSelect({ id }: { id: string }): React.JSX.Element {
  const boards = useAtomValue(boardsAtom)
  const moveLiveCard = useSetAtom(moveLiveCardAtom)
  const boardId = boards.find(board => board.cardIds.includes(id))?.id
  return (
    <CardBoardSelect
      boardId={boardId}
      onMove={async (boardId) => {
        await moveLiveCard({ boardId, cardId: id })
      }}
    />
  )
}

export function DeleteLiveCardButton({ id }: { id: string }): React.JSX.Element {
  const { t } = useI18n()
  const deleteLocal = useSetAtom(deleteLiveCardAtom)
  return (
    <DeleteCardButton
      onDelete={async () => {
        await deleteLocal(id)
      }}
      label={t("deleteLiveCard")}
      pendingLabel={t("deletingLiveCard")}
      errorMessage={t("deleteLiveCardFailed")}
    />
  )
}
