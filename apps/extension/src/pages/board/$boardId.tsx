import type { BoardLayer } from "@/lib/board"
import { useQueryClient } from "@tanstack/react-query"
import { Navigate, useLocation, useParams } from "@tanstack/react-router"
import { useAtomValue, useSetAtom } from "jotai"
import { useEffect, useMemo, useState } from "react"
import { BoardView } from "@/components/board-view"
import { getBoardLayerFromState } from "@/lib/board"
import { restoreInstanceResults } from "@/lib/source/restore-instance-results"
import { handleThemeSwitch } from "@/lib/utils/swith-theme"
import { boardsAtom, instancesAtom } from "@/store/board"
import { currentBoardIdAtom } from "@/store/settings"

interface ReadyBoardView {
  boardId: string
  layer: BoardLayer
}

export function BoardIdComponent() {
  const { boardId } = useParams({ strict: false }) as { boardId: string }
  const layer = useLocation({ select: location => getBoardLayerFromState(location.state) })
  const boards = useAtomValue(boardsAtom)
  const instances = useAtomValue(instancesAtom)
  const queryClient = useQueryClient()
  const setCurrentBoardId = useSetAtom(currentBoardIdAtom)
  const [restoredBoardId, setRestoredBoardId] = useState<string>()
  const [readyView, setReadyView] = useState<ReadyBoardView>()
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

  if (
    layer
    && restoredBoardId === boardId
    && (readyView?.boardId !== boardId || readyView.layer !== layer)
  ) {
    setReadyView({ boardId, layer })
  }

  if (!board) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Board not found.
      </div>
    )
  }

  if (!layer) {
    return (
      <Navigate
        to="/board/$boardId"
        params={{ boardId }}
        state={state => ({ ...state, layer: board.defaultLayer })}
        replace
      />
    )
  }

  const readyBoard = readyView
    ? boards.find(candidate => candidate.id === readyView.boardId)
    : undefined

  if (!readyView || !readyBoard) return null

  return (
    <BoardView board={readyBoard} layer={readyView.layer} />
  )
}
