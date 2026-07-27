import type { BoardSource } from "@/typings/source"
import { useNavigate } from "@tanstack/react-router"
import { useSetAtom, useStore } from "jotai"
import { PhForkDuotone, PhTrashDuotone } from "@/components/icons/ph"
import { createForkedInstance, createSourceInstancePatch } from "@/lib/source-cards"
import {
  deleteInstanceAtom,
  instanceStarredAtom,
  pendingForkFocusAtom,
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
  const navigate = useNavigate()
  const store = useStore()
  const upsertLocal = useSetAtom(upsertInstanceAtom)
  const starLocal = useSetAtom(starInstanceAtom)
  const focusFork = useSetAtom(pendingForkFocusAtom)

  function handleFork(): void {
    const forkedInstance = createForkedInstance(
      source.sourceId,
      createSourceInstancePatch(source, sourceParams),
      { type: "fork", forkedFromInstanceId: id },
    )
    const isStarred = store.get(instanceStarredAtom(id))

    upsertLocal(forkedInstance)

    if (isStarred) {
      starLocal({ instanceId: forkedInstance.instanceId, starred: true })
    }

    focusFork(forkedInstance.instanceId)
    void navigate({ to: "/boards/$boardId", params: { boardId: "forks" } })
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

export function DeleteForkButton({ id, isCustom }: { id: string, isCustom: boolean }) {
  const deleteLocal = useSetAtom(deleteInstanceAtom)

  function handleDelete(): void {
    if (!isCustom) {
      return
    }

    deleteLocal(id)
  }

  if (!isCustom) {
    return null
  }

  return (
    <IconButton
      onClick={(e) => {
        e.stopPropagation()
        handleDelete()
      }}
      aria-label="Delete custom card"
      title="Delete custom card"
    >
      <PhTrashDuotone />
    </IconButton>
  )
}
