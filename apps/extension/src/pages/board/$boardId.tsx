import { useQueryClient } from "@tanstack/react-query"
import { useParams } from "@tanstack/react-router"
import { useAtomValueRawSync, useSetAtom } from "jotai"
import { useEffect, useMemo, useState } from "react"
import { BoardView } from "@/components/board-view"
import { restoreInstanceResults } from "@/lib/source/restore-instance-results"
import { handleThemeSwitch } from "@/lib/utils/swith-theme"
import { boardsAtom, instancesAtom } from "@/store/board"
import { currentBoardIdAtom } from "@/store/settings"

export function BoardIdComponent() {
  const { boardId } = useParams({ from: "/board/$boardId" })
  const boards = useAtomValueRawSync(boardsAtom)
  const instances = useAtomValueRawSync(instancesAtom)
  const queryClient = useQueryClient()
  const setCurrentBoardId = useSetAtom(currentBoardIdAtom)
  const [restoredBoardId, setRestoredBoardId] = useState<string>()
  const board = boards.find(board => board.id === boardId)
  const boardInstanceIds = board?.instanceIds
  const boardInstances = useMemo(() => {
    if (!boardInstanceIds) return []
    const instanceIdSet = new Set(boardInstanceIds)
    return instances.filter(instance => instanceIdSet.has(instance.instanceId))
  }, [boardInstanceIds, instances])
  useEffect(() => {
    document.title = board ? `NewsNext | ${board.name}` : "NewsNext"
    if (board) {
      handleThemeSwitch(board.color)
    }

    return () => {
      document.title = "NewsNext"
    }
  }, [board])

  useEffect(() => {
    if (boardInstanceIds) {
      setCurrentBoardId(boardId)
    }
  }, [boardId, boardInstanceIds, setCurrentBoardId])

  useEffect(() => {
    if (!boardInstanceIds) return
    let active = true
    void restoreInstanceResults(queryClient, boardInstances).finally(() => {
      if (active) setRestoredBoardId(boardId)
    })
    return () => {
      active = false
    }
  }, [boardId, boardInstanceIds, boardInstances, queryClient])

  if (!board) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Board not found.
      </div>
    )
  }

  const readyBoard = boards.find(candidate => candidate.id === restoredBoardId)
  return readyBoard ? <BoardView board={readyBoard} /> : null
}
