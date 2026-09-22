import type { Workspace as NativeWorkspace } from "@/lib/native-protocol/Workspace"
import type { WorkspacePatch as NativeWorkspacePatch } from "@/lib/native-protocol/WorkspacePatch"
import { fromNativeWorkspaceData, toNativeWorkspaceData } from "./native-integration/workspace-data"

export function parseWorkspacePatch(value: unknown): NativeWorkspacePatch {
  if (!isRecord(value)
    || !isNonNegativeSafeInteger(value.expectedRevision)
    || !isNonNegativeSafeInteger(value.updatedAt)
    || !isIdentifierArray(value.boardOrder)
    || !isRecord(value.boards)
    || !isRecord(value.liveCards)
    || !isRecord(value.liveWidgets)
    || typeof value.settings !== "string") {
    throw new Error("The native host returned an invalid Workspace patch")
  }
  return {
    expectedRevision: value.expectedRevision,
    updatedAt: value.updatedAt,
    boardOrder: [...value.boardOrder],
    boards: value.boards as NativeWorkspacePatch["boards"],
    liveCards: value.liveCards as NativeWorkspacePatch["liveCards"],
    liveWidgets: value.liveWidgets as NativeWorkspacePatch["liveWidgets"],
    settings: value.settings,
  }
}

export function createWorkspacePatch(current: NativeWorkspace, candidate: NativeWorkspace): NativeWorkspacePatch {
  return {
    expectedRevision: current.revision,
    updatedAt: candidate.updatedAt,
    boardOrder: candidate.boardOrder,
    boards: changedValues(current.boards, candidate.boards),
    liveCards: changedValues(current.liveCards, candidate.liveCards),
    liveWidgets: changedValues(current.liveWidgets, candidate.liveWidgets),
    settings: candidate.settings,
  }
}

export function applyWorkspacePatch(current: NativeWorkspace, patch: NativeWorkspacePatch): NativeWorkspace {
  if (patch.expectedRevision !== current.revision) {
    throw new Error(`Workspace patch expected revision ${patch.expectedRevision}, current ${current.revision}`)
  }
  const boards = applyEntityPatch(current.boards, patch.boardOrder, patch.boards, "Board")
  const cardIds = patch.boardOrder.flatMap(boardId => boards[boardId]!.nowLayer.liveCards)
  const widgetIds = patch.boardOrder.flatMap(boardId => boards[boardId]!.nextLayer.liveWidgets)
  const liveCards = applyEntityPatch(current.liveCards, cardIds, patch.liveCards, "LiveCard")
  const liveWidgets = applyEntityPatch(current.liveWidgets, widgetIds, patch.liveWidgets, "LiveWidget")
  const normalized = fromNativeWorkspaceData({ boardOrder: patch.boardOrder, boards, liveCards, liveWidgets })
  const normalizedNative = toNativeWorkspaceData(normalized)
  if (normalizedNative.boardOrder.length !== patch.boardOrder.length
    || Object.keys(normalizedNative.boards).length !== Object.keys(boards).length
    || Object.keys(normalizedNative.liveCards).length !== Object.keys(liveCards).length
    || Object.keys(normalizedNative.liveWidgets).length !== Object.keys(liveWidgets).length) {
    throw new Error("Workspace patch produced invalid entities")
  }
  return {
    revision: current.revision + 1,
    updatedAt: patch.updatedAt,
    ...normalizedNative,
    settings: patch.settings,
  }
}

function changedValues<T>(current: Record<string, T>, candidate: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(candidate).filter(([id, value]) => JSON.stringify(current[id]) !== JSON.stringify(value)))
}

function applyEntityPatch<T>(current: Record<string, T>, ids: string[], updates: Record<string, T>, label: string): Record<string, T> {
  if (new Set(ids).size !== ids.length || ids.some(id => !id)) throw new Error(`Workspace patch has invalid ${label} IDs`)
  const required = new Set(ids)
  if (Object.keys(updates).some(id => !required.has(id))) throw new Error(`Workspace patch has an invalid ${label} update`)
  return Object.fromEntries(ids.map((id) => {
    const value = updates[id] ?? current[id]
    if (!value) throw new Error(`Workspace patch references unknown ${label} '${id}'`)
    return [id, value]
  }))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

function isIdentifierArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(id => typeof id === "string" && id.length > 0) && new Set(value).size === value.length
}
