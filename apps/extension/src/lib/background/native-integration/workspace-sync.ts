import type { NativeWorkspace } from "@newsnext/extension-connection"
import type { PersistedSettings } from "../../settings/persisted-settings"
import type { NativePort, RequireNativeConnection } from "./types"
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
import { pendingWorkspaceRequests, takePendingRequest } from "./pending-requests"
import { NATIVE_REQUEST_TIMEOUT_MS, runtime, WORKSPACE_UPDATED_AT_KEY } from "./state"

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
    instances: application.instances,
    settings: serializeWorkspaceSettings(settings),
  }
}

export function serializeWorkspaceSettings(value: unknown): string {
  const settings = normalizePersistedSettings(value)
  return JSON.stringify(settings)
}

export function parseWorkspaceSettings(value: unknown): PersistedSettings {
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

export async function applyWorkspace(
  nextWorkspace: NativeWorkspace,
  nextLocalInstanceIds: string[],
): Promise<void> {
  const application = acceptWorkspace(nextWorkspace, nextLocalInstanceIds)
  const current = await readApplicationData()
  if (JSON.stringify(current) !== JSON.stringify(application)) {
    await mirrorApplicationData(application)
  }
  await mirrorWorkspaceSettings(nextWorkspace.settings)
  await persistWorkspaceUpdatedAt(nextWorkspace.updatedAt)
}

export function acceptWorkspace(
  nextWorkspace: NativeWorkspace,
  nextLocalInstanceIds: string[],
) {
  runtime.workspace = nextWorkspace
  runtime.localInstanceIds = new Set(nextLocalInstanceIds)
  return normalizeApplicationData({
    version: APPLICATION_DATA_VERSION,
    boards: nextWorkspace.boards,
    instances: nextWorkspace.instances,
  })
}

export function enqueueIncomingWorkspace(
  connection: NativePort,
  resolveWorkspace: () => NativeWorkspace,
  nextLocalInstanceIds: string[],
  errorMessage: string,
): void {
  void enqueueWorkspaceOperation(async () => {
    if (!runtime.enabled || runtime.port !== connection) return
    await applyWorkspace(resolveWorkspace(), nextLocalInstanceIds)
  }).catch((error) => {
    console.error(errorMessage, error)
  })
}

export function enqueueWorkspaceReplacement(
  update: (current: NativeWorkspace) => NativeWorkspace,
  requireConnection: RequireNativeConnection,
): Promise<NativeWorkspace> {
  return enqueueWorkspaceOperation(async () => {
    const committed = await requestWorkspaceReplacement(update(runtime.workspace), requireConnection)
    await persistWorkspaceUpdatedAt(committed.updatedAt)
    return committed
  })
}

export function settleWorkspaceRequest(
  requestId: string,
  revision: number,
  nextLocalInstanceIds: string[],
): void {
  const pending = takePendingRequest(pendingWorkspaceRequests, requestId)
  if (!pending) return
  const committed = {
    ...pending.candidate,
    revision,
  }
  acceptWorkspace(committed, nextLocalInstanceIds)
  pending.resolve(committed)
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
      const nextLocalInstanceIds = candidate.instances
        .filter(instance => instance.workerId === runtime.workerId)
        .map(instance => instance.instanceId)
      await persistWorkspaceUpdatedAt(candidate.updatedAt)
      return acceptWorkspace(candidate, nextLocalInstanceIds)
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
      instances: committed.instances,
    })
  })
}

export function applyWorkspaceChangePatch(patch: Parameters<typeof applyWorkspacePatch>[1]): NativeWorkspace {
  return applyWorkspacePatch(runtime.workspace, patch)
}

export async function persistWorkspaceUpdatedAt(updatedAt: number): Promise<void> {
  await browser.storage.local.set({ [WORKSPACE_UPDATED_AT_KEY]: updatedAt })
}

export function nextWorkspaceUpdatedAt(current: number): number {
  return Math.max(Date.now(), current + 1)
}

async function requestWorkspaceReplacement(
  candidate: NativeWorkspace,
  requireConnection: RequireNativeConnection,
): Promise<NativeWorkspace> {
  const connection = await requireConnection()
  const message = {
    type: "workspaceChanged" as const,
    requestId: crypto.randomUUID(),
    patch: createWorkspacePatch(runtime.workspace, candidate),
  }
  return await new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingWorkspaceRequests.delete(message.requestId)
      reject(new Error("Timed out waiting for the NewsNext Workspace commit"))
    }, NATIVE_REQUEST_TIMEOUT_MS)
    pendingWorkspaceRequests.set(message.requestId, {
      candidate,
      reject,
      resolve,
      timeoutId,
    })
    connection.postMessage(message)
  })
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
