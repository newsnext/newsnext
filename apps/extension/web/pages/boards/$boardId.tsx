import type { BoardType } from "@/store/board"
import { useParams } from "@tanstack/react-router"
import { Desk } from "@/components/desk"

export function BoardIdComponent() {
  const { boardId } = useParams({ strict: false }) as { boardId: BoardType }
  return <Desk boardId={boardId} />
}
