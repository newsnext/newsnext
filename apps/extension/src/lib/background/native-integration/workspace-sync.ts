import type { PersistedSettings } from "../../settings/persisted-settings"
import type { NativePort, RequireNativeConnection } from "./types"
import type { Workspace as NativeWorkspace } from "@/lib/native-protocol/Workspace"
import { browser } from "#imports"
import { APPLICATION_DATA_VERSION } from "../../application"
import { normalizeApplicationData, PERSISTED_DATA_SLICES } from "../../settings/persisted-data"
import { normalizePersistedSettings } from "../../settings/persisted-settings"
import {
  mirrorApplicationData,
  readApplicationData,
  setApplicationDataCommitter,
} from "../application-service"
import { applyWorkspacePatch, createWorkspacePatch } from "../workspace-patch"
import { nativeRpc } from "./rpc"
import { runtime, WORKSPACE_UPDATED_AT_KEY } from "./state"

export function createWorkspace(
  value: unknown,
  revision: number,
  updatedAt: number,
  settings: unknown,
): NativeWorkspace {
  const application = normalizeApplicationData(value)
  return {
    revision,
    updatedAt,
    boards: application.boards,
    liveCards: application.liveCards,
    settings: serializeWorkspaceSettings(settings),
  }
}

function serializeWorkspaceSettings(value: unknown): string {
  const settings = normalizePersistedSettings(value)
  return JSON.stringify(settings)
}

function parseWorkspaceSettings(value: unknown): PersistedSettings {
  if (typeof value !== "string") {
    throw new TypeError("The native host returned invalid Workspace Settings")
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error("The native host returned invalid Workspace Settings")
  }
  if (!isRecord(parsed)) {
    throw new TypeError("The native host returned invalid Workspace Settings")
  }
  return normalizePersistedSettings(parsed)
}

async function applyWorkspace(
  nextWorkspace: NativeWorkspace,
  nextLocalCardIds: string[],
): Promise<void> {
  const application = acceptWorkspace(nextWorkspace, nextLocalCardIds)
  const current = await readApplicationData()
  if (JSON.stringify(current) !== JSON.stringify(application)) {
    await mirrorApplicationData(application)
  }
  await mirrorWorkspaceSettings(nextWorkspace.settings)
  await persistWorkspaceUpdatedAt(nextWorkspace.updatedAt)
}

function acceptWorkspace(
  nextWorkspace: NativeWorkspace,
  nextLocalCardIds: string[],
) {
  runtime.workspace = nextWorkspace
  runtime.localCardIds = new Set(nextLocalCardIds)
  return normalizeApplicationData({
    version: APPLICATION_DATA_VERSION,
    boards: nextWorkspace.boards,
    liveCards: nextWorkspace.liveCards,
  })
}

export function enqueueIncomingWorkspace(
  connection: NativePort,
  resolveWorkspace: () => NativeWorkspace,
  nextLocalCardIds: string[],
  errorMessage: string,
): void {
  void enqueueWorkspaceOperation(async () => {
    if (!runtime.enabled || runtime.port !== connection) return
    await applyWorkspace(resolveWorkspace(), nextLocalCardIds)
  }).catch((error) => {
    console.error(errorMessage, error)
  })
}

function enqueueWorkspaceReplacement(
  update: (current: NativeWorkspace) => NativeWorkspace,
  requireConnection: RequireNativeConnection,
): Promise<NativeWorkspace> {
  return enqueueWorkspaceOperation(async () => {
    const committed = await requestWorkspaceReplacement(update(runtime.workspace), requireConnection)
    await persistWorkspaceUpdatedAt(committed.updatedAt)
    return committed
  })
}

export async function commitSettings(
  settings: PersistedSettings,
  requireConnection: RequireNativeConnection,
): Promise<void> {
  const serialized = serializeWorkspaceSettings(settings)
  if (runtime.workspace.settings === serialized) return
  if (!runtime.enabled) {
    runtime.workspace = {
      ...runtime.workspace,
      updatedAt: nextWorkspaceUpdatedAt(runtime.workspace.updatedAt),
      settings: serialized,
    }
    await persistWorkspaceUpdatedAt(runtime.workspace.updatedAt)
    return
  }

  try {
    await enqueueWorkspaceReplacement(current => ({
      ...current,
      updatedAt: nextWorkspaceUpdatedAt(current.updatedAt),
      settings: serialized,
    }), requireConnection)
  } catch (error) {
    await mirrorWorkspaceSettings(runtime.workspace.settings)
    throw error
  }
}

export function registerApplicationDataSync(requireConnection: RequireNativeConnection): void {
  setApplicationDataCommitter(async (application) => {
    if (!runtime.enabled) {
      const candidate = createWorkspace(
        application,
        runtime.workspace.revision,
        nextWorkspaceUpdatedAt(runtime.workspace.updatedAt),
        parseWorkspaceSettings(runtime.workspace.settings),
      )
      const nextLocalCardIds = candidate.liveCards
        .filter(card => card.workerId === runtime.workerId)
        .map(card => card.cardId)
      await persistWorkspaceUpdatedAt(candidate.updatedAt)
      return acceptWorkspace(candidate, nextLocalCardIds)
    }
    const committed = await enqueueWorkspaceReplacement(current => createWorkspace(
      application,
      current.revision,
      nextWorkspaceUpdatedAt(current.updatedAt),
      parseWorkspaceSettings(current.settings),
    ), requireConnection)
    return normalizeApplicationData({
      version: APPLICATION_DATA_VERSION,
      boards: committed.boards,
      liveCards: committed.liveCards,
    })
  })
}

export function applyWorkspaceChangePatch(patch: Parameters<typeof applyWorkspacePatch>[1]): NativeWorkspace {
  return applyWorkspacePatch(runtime.workspace, patch)
}

async function persistWorkspaceUpdatedAt(updatedAt: number): Promise<void> {
  await browser.storage.local.set({ [WORKSPACE_UPDATED_AT_KEY]: updatedAt })
}

function nextWorkspaceUpdatedAt(current: number): number {
  return Math.max(Date.now(), current + 1)
}

async function requestWorkspaceReplacement(
  candidate: NativeWorkspace,
  requireConnection: RequireNativeConnection,
): Promise<NativeWorkspace> {
  const connection = await requireConnection()
  const routingRevision = runtime.workerRoutingRevision
  const result = await nativeRpc(connection).request("workspaceCommit", {
    patch: createWorkspacePatch(runtime.workspace, candidate),
  })
  if (!runtime.enabled || runtime.port !== connection) throw new Error("NewsNext App disconnected during Workspace commit")
  const committed = { ...candidate, revision: result.revision }
  acceptWorkspace(committed, runtime.workerRoutingRevision === routingRevision
    ? result.localCardIds
    : [...runtime.localCardIds])
  return committed
}

function enqueueWorkspaceOperation<Result>(
  operation: () => Promise<Result>,
): Promise<Result> {
  const result = runtime.workspaceCommitQueue.then(operation)
  runtime.workspaceCommitQueue = result.then(() => undefined, () => undefined)
  return result
}

async function mirrorWorkspaceSettings(serialized: string): Promise<void> {
  const key = PERSISTED_DATA_SLICES.settings.key
  const stored = await browser.storage.local.get(key)
  const local = normalizePersistedSettings(stored[key])
  const settings = parseWorkspaceSettings(serialized)
  if (JSON.stringify(local) !== JSON.stringify(settings)) {
    await browser.storage.local.set({ [key]: settings })
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
