import { useAtomValue, useSetAtom } from "jotai"
import { BoardMembershipSelect } from "@/components/common/board-membership-select"
import { PhTrashDuotone } from "@/components/icons/ph"
import { useAsyncAction, useKeyedAsyncAction } from "@/hooks/use-async-action"
import {
  collectionEntriesAtom,
  deleteInstanceAtom,
  setInstanceCollectionMembershipAtom,
} from "@/store/board"
import { CardHeaderActionButton } from "../card-header"

export function CardBoardSelect({ id }: { id: string }) {
  const entries = useAtomValue(collectionEntriesAtom)
  const setMembership = useSetAtom(setInstanceCollectionMembershipAtom)
  const {
    error: membershipError,
    isPending: isMembershipPending,
    run: runMembershipUpdate,
  } = useKeyedAsyncAction<string>("Board membership could not be updated.")
  const collectionIds = entries
    .filter(entry => entry.instanceId === id)
    .map(entry => entry.collectionId)
  async function updateMembership(collectionId: string, member: boolean): Promise<void> {
    await runMembershipUpdate(collectionId, async () => {
      await setMembership({ collectionId, instanceId: id, member })
    })
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold opacity-80">Boards</span>
      <BoardMembershipSelect
        value={collectionIds}
        onMembershipChange={(boardId, member) => void updateMembership(boardId, member)}
        ariaLabel="Edit board memberships"
        isBoardDisabled={isMembershipPending}
      />
      {membershipError && <span role="alert" className="sr-only">{membershipError}</span>}
    </div>
  )
}

export function DeleteCardButton({ id }: { id: string }) {
  const deleteLocal = useSetAtom(deleteInstanceAtom)
  const { error: deleteError, isPending: isDeleting, run: runDelete } = useAsyncAction(
    "The card could not be deleted.",
  )

  async function handleDelete(): Promise<void> {
    await runDelete(async () => {
      await deleteLocal(id)
    })
  }

  return (
    <>
      <CardHeaderActionButton
        disabled={isDeleting}
        onClick={(e) => {
          e.stopPropagation()
          void handleDelete()
        }}
        aria-label="Delete card"
        title={deleteError ?? "Delete card"}
      >
        <PhTrashDuotone />
      </CardHeaderActionButton>
      {deleteError && <span role="alert" className="sr-only">{deleteError}</span>}
    </>
  )
}
