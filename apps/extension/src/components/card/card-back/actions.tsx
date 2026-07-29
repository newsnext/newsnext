import { useSetAtom } from "jotai"
import { BoardMembershipSelect } from "@/components/common/board-membership-select"
import { PhTrashDuotone } from "@/components/icons/ph"
import { deleteInstanceAtom, moveInstanceToBoardAtom } from "@/store/board"
import { IconButton } from "../../common/button"

export function CardBoardSelect({ id, boardId }: { id: string, boardId: string | null }) {
  const moveInstance = useSetAtom(moveInstanceToBoardAtom)

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold opacity-80">Board</span>
      <BoardMembershipSelect
        value={boardId}
        onValueChange={(boardId) => {
          moveInstance({ instanceId: id, boardId })
        }}
        ariaLabel="Move card to board"
        className="bg-background/45"
      />
    </div>
  )
}

export function DeleteCardButton({ id }: { id: string }) {
  const deleteLocal = useSetAtom(deleteInstanceAtom)

  return (
    <IconButton
      onClick={(e) => {
        e.stopPropagation()
        deleteLocal(id)
      }}
      aria-label="Delete card"
      title="Delete card"
    >
      <PhTrashDuotone />
    </IconButton>
  )
}
