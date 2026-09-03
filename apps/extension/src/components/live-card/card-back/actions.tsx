import { useAtomValue, useSetAtom } from "jotai"
import { BoardSelect } from "@/components/common/board-select"
import { ConfirmDestructiveButton } from "@/components/common/confirm-destructive-button"
import { PhTrashDuotone } from "@/components/icons/ph"
import { useAsyncAction, useKeyedAsyncAction } from "@/hooks/use-async-action"
import { useI18n } from "@/hooks/use-i18n"
import {
  boardsAtom,
  deleteInstanceAtom,
  moveInstanceAtom,
} from "@/store/board"

export function LiveCardBoardSelect({ id }: { id: string }) {
  const { t } = useI18n()
  const boards = useAtomValue(boardsAtom)
  const moveInstance = useSetAtom(moveInstanceAtom)
  const {
    error: moveError,
    isPending: isMovePending,
    run: runMove,
  } = useKeyedAsyncAction<string>(t("moveLiveCardFailed"))
  const boardId = boards.find(board => board.instanceIds.includes(id))?.id
  async function moveToBoard(targetBoardId: string): Promise<void> {
    if (!boardId || targetBoardId === boardId) return
    await runMove(targetBoardId, async () => {
      await moveInstance({ boardId: targetBoardId, instanceId: id })
    })
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold opacity-80">{t("boards")}</span>
      <BoardSelect
        value={boardId}
        onValueChange={targetBoardId => void moveToBoard(targetBoardId)}
        ariaLabel={t("moveLiveCardToBoard")}
        isBoardDisabled={isMovePending}
      />
      {moveError && <span role="alert" className="sr-only">{moveError}</span>}
    </div>
  )
}

export function DeleteLiveCardButton({ id }: { id: string }) {
  const { t } = useI18n()
  const deleteLocal = useSetAtom(deleteInstanceAtom)
  const {
    error: deleteError,
    isPending: isDeleting,
    resetError: resetDeleteError,
    run: runDelete,
  } = useAsyncAction(t("deleteLiveCardFailed"))

  async function handleDelete(): Promise<void> {
    await runDelete(async () => {
      await deleteLocal(id)
    })
  }

  return (
    <>
      <ConfirmDestructiveButton
        appearance="icon-expand"
        size="icon-fit"
        icon={<PhTrashDuotone />}
        label={t("deleteLiveCard")}
        confirmLabel={t("delete")}
        resetAfterMs={3000}
        pending={isDeleting}
        pendingLabel={t("deletingLiveCard")}
        className="border-0 text-lg opacity-50 hover:opacity-85 data-[confirmation=armed]:h-6 data-[confirmation=armed]:gap-0.5 data-[confirmation=armed]:px-2 data-[confirmation=armed]:text-xs data-[confirmation=armed]:opacity-100 active:not-aria-[haspopup]:translate-y-0"
        title={deleteError ?? undefined}
        onArm={resetDeleteError}
        onConfirm={handleDelete}
      />
      {deleteError && <span role="alert" className="sr-only">{deleteError}</span>}
    </>
  )
}
