import type { BoardSource } from "@/typings/source"
import { useMutation } from "@tanstack/react-query"
import { useSetAtom, useStore } from "jotai"
import { PhForkDuotone, PhTrashDuotone } from "@/components/icons/ph"
import { orpc } from "@/lib/orpc"
import { createForkedInstance } from "@/lib/source-cards"
import { deleteStoredSourceParamValues, writeStoredSourceParamValues } from "@/lib/source-params"
import {
  deleteInstanceAtom,
  instanceStarredAtom,
  starInstanceAtom,
  upsertInstanceAtom,
} from "@/store/board"
import { IconButton } from "../../common/button"

export function ForkButton({
  id,
  source,
  sourceParams,
}: {
  id: string
  source: BoardSource
  sourceParams: Record<string, unknown>
}) {
  const store = useStore()
  const upsertLocal = useSetAtom(upsertInstanceAtom)
  const starLocal = useSetAtom(starInstanceAtom)
  const upsertSourceInstance = useMutation(orpc.upsertSourceInstance.mutationOptions({ onError: () => {} }))
  const setStarredSourceInstance = useMutation(orpc.setStarredSourceInstance.mutationOptions({ onError: () => {} }))

  function handleFork(): void {
    const forkedInstance = createForkedInstance(source.sourceId, sourceParams)
    const isStarred = store.get(instanceStarredAtom(id))

    writeStoredSourceParamValues(forkedInstance.instanceId, sourceParams)
    upsertSourceInstance.mutate(forkedInstance)
    upsertLocal(forkedInstance)

    if (isStarred) {
      starLocal({ instanceId: forkedInstance.instanceId, starred: true })
      setStarredSourceInstance.mutate({ instanceId: forkedInstance.instanceId, starred: true })
    }
  }

  return (
    <IconButton
      onClick={(e) => {
        e.stopPropagation()
        handleFork()
      }}
      aria-label="Fork"
      title="Fork"
    >
      <PhForkDuotone />
    </IconButton>
  )
}

export function DeleteForkButton({ id, isFork }: { id: string, isFork: boolean }) {
  const deleteLocal = useSetAtom(deleteInstanceAtom)
  const deleteSourceInstance = useMutation(orpc.deleteSourceInstance.mutationOptions({ onError: () => {} }))

  function handleDelete(): void {
    if (!isFork) {
      return
    }

    deleteLocal(id)
    deleteStoredSourceParamValues(id)
    deleteSourceInstance.mutate({ instanceId: id })
  }

  if (!isFork) {
    return null
  }

  return (
    <IconButton
      onClick={(e) => {
        e.stopPropagation()
        handleDelete()
      }}
      aria-label="Delete Fork"
      title="Delete Fork"
    >
      <PhTrashDuotone />
    </IconButton>
  )
}
