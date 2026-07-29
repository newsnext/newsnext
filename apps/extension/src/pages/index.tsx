import { Navigate } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { currentBoardIdAtom, defaultBoardIdAtom } from "@/store/board"

export function IndexComponent() {
  const currentBoardId = useAtomValue(currentBoardIdAtom)
  const defaultBoardId = useAtomValue(defaultBoardIdAtom)

  return <Navigate to="/board/$boardId" params={{ boardId: defaultBoardId ?? currentBoardId }} replace />
}
