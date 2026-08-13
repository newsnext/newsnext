import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@newsnext/ui/components/dropdown-menu"
import { useAtomValue, useSetAtom } from "jotai"
import { PhTrashDuotone } from "@/components/icons/ph"
import { useAsyncAction, useKeyedAsyncAction } from "@/hooks/use-async-action"
import { ALL_BOARD_ID } from "@/lib/board"
import {
  boardsAtom,
  collectionEntriesAtom,
  deleteInstanceAtom,
  setInstanceCollectionMembershipAtom,
} from "@/store/board"
import { CardHeaderActionButton } from "../card-header"

export function CardBoardSelect({ id }: { id: string }) {
  const boards = useAtomValue(boardsAtom).filter(board => board.id !== ALL_BOARD_ID)
  const entries = useAtomValue(collectionEntriesAtom)
  const setMembership = useSetAtom(setInstanceCollectionMembershipAtom)
  const {
    error: membershipError,
    isPending: isMembershipPending,
    run: runMembershipUpdate,
  } = useKeyedAsyncAction<string>("Board membership could not be updated.")
  const collectionIds = new Set(entries
    .filter(entry => entry.instanceId === id)
    .map(entry => entry.collectionId))
  const selectedBoards = boards.filter(board => collectionIds.has(board.id))
  const label = selectedBoards.length === 0
    ? "No boards"
    : selectedBoards.length === 1
      ? selectedBoards[0]!.name
      : `${selectedBoards.length} boards`

  async function updateMembership(collectionId: string, member: boolean): Promise<void> {
    await runMembershipUpdate(collectionId, async () => {
      await setMembership({ collectionId, instanceId: id, member })
    })
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold opacity-80">Boards</span>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex h-8 max-w-48 items-center rounded-xl bg-background/45 px-3 text-sm outline-none ring-1 ring-foreground/10 hover:bg-background/60 focus-visible:ring-2 focus-visible:ring-theme-400"
          onClick={event => event.stopPropagation()}
          aria-label="Edit board memberships"
        >
          <span className="truncate">{label}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={event => event.stopPropagation()}>
          {boards.length === 0
            ? <DropdownMenuItem disabled>No boards available</DropdownMenuItem>
            : boards.map(board => (
                <DropdownMenuCheckboxItem
                  key={board.id}
                  checked={collectionIds.has(board.id)}
                  closeOnClick={false}
                  disabled={isMembershipPending(board.id)}
                  onCheckedChange={(member) => {
                    void updateMembership(board.id, member)
                  }}
                >
                  {board.name}
                </DropdownMenuCheckboxItem>
              ))}
        </DropdownMenuContent>
      </DropdownMenu>
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
