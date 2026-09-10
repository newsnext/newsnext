import { useAtomValue, useSetAtom } from "jotai"
import { useI18n } from "@/hooks/use-i18n"
import {
  boardsAtom,
  deleteInstanceAtom,
  moveInstanceAtom,
} from "@/store/board"
import { CardBoardSelect } from "./board-select"
import { DeleteCardButton } from "./delete-card-button"

export function LiveCardBoardSelect({ id }: { id: string }): React.JSX.Element {
  const boards = useAtomValue(boardsAtom)
  const moveInstance = useSetAtom(moveInstanceAtom)
  const boardId = boards.find(board => board.instanceIds.includes(id))?.id
  return (
    <CardBoardSelect
      boardId={boardId}
      onMove={async (boardId) => {
        await moveInstance({ boardId, instanceId: id })
      }}
    />
  )
}

export function DeleteLiveCardButton({ id }: { id: string }): React.JSX.Element {
  const { t } = useI18n()
  const deleteLocal = useSetAtom(deleteInstanceAtom)
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
