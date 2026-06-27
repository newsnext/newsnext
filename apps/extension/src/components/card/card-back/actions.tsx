import type { BoardSource } from "@/typings/source"
import { useSetAtom, useStore } from "jotai"
import { PhForkDuotone, PhTrashDuotone } from "@/components/icons/ph"
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

  function handleFork(): void {
    const forkedInstance = createForkedInstance(source.sourceId, sourceParams)
    const isStarred = store.get(instanceStarredAtom(id))

    writeStoredSourceParamValues(forkedInstance.instanceId, sourceParams)
    upsertLocal(forkedInstance)

    if (isStarred) {
      starLocal({ instanceId: forkedInstance.instanceId, starred: true })
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

  function handleDelete(): void {
    if (!isFork) {
      return
    }

    deleteLocal(id)
    deleteStoredSourceParamValues(id)
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
