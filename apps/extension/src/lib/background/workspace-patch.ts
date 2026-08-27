import type { NativeWorkspace, NativeWorkspacePatch } from "@newsnext/extension-connection"
import { APPLICATION_DATA_VERSION } from "../application"
import { normalizeApplicationData } from "../settings/persisted-data"

export function createWorkspacePatch(
  current: NativeWorkspace,
  candidate: NativeWorkspace,
): NativeWorkspacePatch {
  return {
    expectedRevision: current.revision,
    boardOrder: candidate.boards.map(board => board.id),
    boards: changedValues(current.boards, candidate.boards, board => board.id),
    instanceOrder: candidate.instances.map(instance => instance.instanceId),
    instances: changedValues(
      current.instances,
      candidate.instances,
      instance => instance.instanceId,
    ),
  }
}

export function applyWorkspacePatch(
  current: NativeWorkspace,
  patch: NativeWorkspacePatch,
): NativeWorkspace {
  if (patch.expectedRevision !== current.revision) {
    throw new Error(
      `Workspace patch expected revision ${patch.expectedRevision}, current ${current.revision}`,
    )
  }
  const boards = applyOrderedPatch(
    current.boards,
    patch.boardOrder,
    patch.boards,
    board => board.id,
    "Board",
  )
  const instances = applyOrderedPatch(
    current.instances,
    patch.instanceOrder,
    patch.instances,
    instance => instance.instanceId,
    "Instance",
  )
  const normalized = normalizeApplicationData({
    version: APPLICATION_DATA_VERSION,
    boards,
    instances,
  })
  if (normalized.boards.length !== boards.length
    || normalized.instances.length !== instances.length) {
    throw new Error("Workspace patch produced invalid entities")
  }
  return {
    revision: current.revision + 1,
    boards: normalized.boards,
    instances: normalized.instances,
  }
}

function changedValues<T>(
  current: T[],
  candidate: T[],
  id: (value: T) => string,
): T[] {
  const currentValues = new Map(current.map(value => [id(value), JSON.stringify(value)]))
  return candidate.filter(value => currentValues.get(id(value)) !== JSON.stringify(value))
}

function applyOrderedPatch<T>(
  current: T[],
  order: string[],
  updates: T[],
  id: (value: T) => string,
  label: string,
): T[] {
  if (new Set(order).size !== order.length || order.some(value => !value)) {
    throw new Error(`Workspace patch has invalid ${label} order`)
  }
  const orderIds = new Set(order)
  const values = new Map(current.map(value => [id(value), value]))
  const updatedIds = new Set<string>()
  for (const update of updates) {
    const updateId = id(update)
    if (!updateId || !orderIds.has(updateId) || updatedIds.has(updateId)) {
      throw new Error(`Workspace patch has an invalid ${label} update`)
    }
    updatedIds.add(updateId)
    values.set(updateId, update)
  }
  return order.map((orderedId) => {
    const value = values.get(orderedId)
    if (!value) throw new Error(`Workspace patch references unknown ${label} '${orderedId}'`)
    return value
  })
}
