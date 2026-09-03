import type { NativeWorkspace, NativeWorkspacePatch } from "@newsnext/extension-connection"
import { APPLICATION_DATA_VERSION } from "../application"
import {
  normalizeApplicationData,
  normalizeBoards,
  normalizeInstances,
} from "../settings/persisted-data"

export function parseWorkspacePatch(value: unknown): NativeWorkspacePatch {
  if (!isRecord(value)
    || !isNonNegativeSafeInteger(value.expectedRevision)
    || !isNonNegativeSafeInteger(value.updatedAt)
    || !isIdentifierArray(value.boardOrder)
    || !Array.isArray(value.boards)
    || !isIdentifierArray(value.instanceOrder)
    || !Array.isArray(value.instances)
    || typeof value.settings !== "string") {
    throw new Error("The native host returned an invalid Workspace patch")
  }
  const boards = normalizeBoards(value.boards)
  const instances = normalizeInstances(value.instances)
  if (boards.length !== value.boards.length
    || instances.length !== value.instances.length) {
    throw new Error("The native host returned invalid Workspace patch entities")
  }
  return {
    expectedRevision: value.expectedRevision,
    updatedAt: value.updatedAt,
    boardOrder: [...value.boardOrder],
    boards,
    instanceOrder: [...value.instanceOrder],
    instances,
    settings: value.settings,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

function isIdentifierArray(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.every(id => typeof id === "string" && id.length > 0)
    && new Set(value).size === value.length
}

export function createWorkspacePatch(
  current: NativeWorkspace,
  candidate: NativeWorkspace,
): NativeWorkspacePatch {
  return {
    expectedRevision: current.revision,
    updatedAt: candidate.updatedAt,
    boardOrder: candidate.boards.map(board => board.id),
    boards: changedValues(current.boards, candidate.boards, board => board.id),
    instanceOrder: candidate.instances.map(instance => instance.instanceId),
    instances: changedValues(
      current.instances,
      candidate.instances,
      instance => instance.instanceId,
    ),
    settings: candidate.settings,
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
    updatedAt: patch.updatedAt,
    boards: normalized.boards,
    instances: normalized.instances,
    settings: patch.settings,
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
