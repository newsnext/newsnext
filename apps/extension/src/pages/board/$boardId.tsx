import { useQueryClient } from "@tanstack/react-query"
import { Navigate, useLocation, useParams } from "@tanstack/react-router"
import { useAtomValue, useSetAtom } from "jotai"
import { useEffect, useMemo, useState } from "react"
import { BoardView } from "@/components/board-view"
import { useSourceDescriptors } from "@/hooks/use-source-descriptors"
import { getBoardLayerFromState } from "@/lib/board"
import { restorePersistedSourceResults } from "@/lib/source/persisted-results"
import { restoreRemoteSourceResults, selectRemoteInstances } from "@/lib/source/remote-results"
import { handleThemeSwitch } from "@/lib/utils/swith-theme"
import { boardsAtom, instancesAtom, nodesAtom } from "@/store/board"
import { currentBoardIdAtom } from "@/store/settings"

export function BoardIdComponent() {
  const { boardId } = useParams({ strict: false }) as { boardId: string }
  const layer = useLocation({ select: location => getBoardLayerFromState(location.state) })
  const boards = useAtomValue(boardsAtom)
  const instances = useAtomValue(instancesAtom)
  const nodes = useAtomValue(nodesAtom)
  const { sources } = useSourceDescriptors()
  const queryClient = useQueryClient()
  const setCurrentBoardId = useSetAtom(currentBoardIdAtom)
  const [restoredSourceKey, setRestoredSourceKey] = useState<string>()
  const board = boards.find(board => board.id === boardId)
  const boardInstanceIds = board?.instanceIds
  const boardInstances = useMemo(() => {
    if (!boardInstanceIds) return []
    const instanceIdSet = new Set(boardInstanceIds)
    return instances.filter(instance => instanceIdSet.has(instance.instanceId))
  }, [boardInstanceIds, instances])
  const remoteInstances = useMemo(
    () => selectRemoteInstances(boardInstanceIds ?? [], instances, nodes),
    [boardInstanceIds, instances, nodes],
  )
  const boardSources = useMemo(() => {
    const sourceIds = new Set(boardInstances.map(instance => instance.sourceId))
    return sources.filter(source => sourceIds.has(source.id))
  }, [boardInstances, sources])
  const sourceRestorationKey = useMemo(() => JSON.stringify({
    local: boardInstances.map(instance => ({
      params: instance.patch.params,
      sourceId: instance.sourceId,
      version: boardSources.find(source => source.id === instance.sourceId)?.version,
    })),
    remote: remoteInstances.map(({ instance, nodeId }) => ({
      instanceId: instance.instanceId,
      nodeId,
      params: instance.patch.params,
      sourceId: instance.sourceId,
    })),
  }), [boardInstances, boardSources, remoteInstances])

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
    void Promise.all([
      restorePersistedSourceResults(queryClient, boardInstances, boardSources),
      restoreRemoteSourceResults(queryClient, remoteInstances),
    ]).finally(() => {
      if (active) setRestoredSourceKey(sourceRestorationKey)
    })
    return () => {
      active = false
    }
  }, [boardInstanceIds, boardInstances, boardSources, queryClient, remoteInstances, sourceRestorationKey])

  if (!board) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Board not found.
      </div>
    )
  }

  if (restoredSourceKey !== sourceRestorationKey) return null

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

  return (
    <BoardView board={board} layer={layer} />
  )
}
