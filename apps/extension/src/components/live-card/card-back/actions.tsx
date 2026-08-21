import { useAtomValue, useSetAtom } from "jotai"
import { BoardMembershipSelect } from "@/components/common/board-membership-select"
import { ConfirmDestructiveButton } from "@/components/common/confirm-destructive-button"
import { PhTrashDuotone } from "@/components/icons/ph"
import { useAsyncAction, useKeyedAsyncAction } from "@/hooks/use-async-action"
import {
  collectionsAtom,
  deleteInstanceAtom,
  setInstanceCollectionMembershipAtom,
} from "@/store/board"

export function LiveCardBoardSelect({ id }: { id: string }) {
  const collections = useAtomValue(collectionsAtom)
  const setMembership = useSetAtom(setInstanceCollectionMembershipAtom)
  const {
    error: membershipError,
    isPending: isMembershipPending,
    run: runMembershipUpdate,
  } = useKeyedAsyncAction<string>("Board membership could not be updated.")
  const collectionIds = collections
    .filter(collection => collection.instanceIds.includes(id))
    .map(collection => collection.id)
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

export function DeleteLiveCardButton({ id }: { id: string }) {
  const deleteLocal = useSetAtom(deleteInstanceAtom)
  const {
    error: deleteError,
    isPending: isDeleting,
    resetError: resetDeleteError,
    run: runDelete,
  } = useAsyncAction("The LiveCard could not be deleted.")

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
        label="Delete LiveCard"
        confirmLabel="Delete"
        resetAfterMs={3000}
        pending={isDeleting}
        pendingLabel="Deleting LiveCard…"
        className="border-0 text-lg opacity-50 hover:opacity-85 data-[confirmation=armed]:h-6 data-[confirmation=armed]:gap-0.5 data-[confirmation=armed]:px-2 data-[confirmation=armed]:text-xs data-[confirmation=armed]:opacity-100 active:not-aria-[haspopup]:translate-y-0"
        title={deleteError ?? undefined}
        onArm={resetDeleteError}
        onConfirm={handleDelete}
      />
      {deleteError && <span role="alert" className="sr-only">{deleteError}</span>}
    </>
  )
}
