import type {
  ApplicationData,
  ApplicationMutationDependencies,
  ApplicationMutationExecution,
  ApplicationMutationResult,
} from "../application"
import { loadSourceDescriptors } from "@newsnext/source-kit/runtime"
import { browser } from "#imports"
import {
  ensureApplicationDataIntegrity,
} from "../application"
import { createId } from "../id"
import {
  normalizeApplicationData,
  normalizePersistedSettings,
  PERSISTED_DATA_SLICES,
} from "../settings"

let mutationQueue: Promise<void> = loadApplicationData().then(
  () => undefined,
  () => undefined,
)
let applicationDataCommitter:
  | ((value: ApplicationData) => Promise<ApplicationData>)
  | undefined

export function setApplicationDataCommitter(
  committer: (value: ApplicationData) => Promise<ApplicationData>,
): void {
  applicationDataCommitter = committer
}

export async function mutateApplicationData(
  operation: (
    data: ApplicationData,
    dependencies: ApplicationMutationDependencies,
  ) => ApplicationMutationExecution,
  options: {
    deletedBoardId?: string
    targetBoardId?: string
  } = {},
): Promise<ApplicationMutationResult> {
  const execution = mutationQueue.then(async () => {
    const data = await loadApplicationData()
    const result = operation(data, {
      createId,
      now: Date.now,
    })
    const committedData = applicationDataCommitter
      ? await applicationDataCommitter(result.data)
      : result.data
    const updates: Record<string, unknown> = {
      [PERSISTED_DATA_SLICES.application.key]: committedData,
    }
    if (options.deletedBoardId) {
      const settingsKey = PERSISTED_DATA_SLICES.settings.key
      const stored = await browser.storage.local.get(settingsKey)
      const settings = normalizePersistedSettings(stored[settingsKey])
      const destinationBoardId = options.targetBoardId
        ?? committedData.boards[0]?.id
      if (!destinationBoardId) throw new Error("NewsNext must keep at least one Board")
      if (settings.general.defaultBoardId === options.deletedBoardId) {
        updates[settingsKey] = {
          ...settings,
          general: { ...settings.general, defaultBoardId: destinationBoardId },
        }
      }
    }
    await browser.storage.local.set(updates)
    return result.result ?? {}
  })
  mutationQueue = execution.then(() => undefined, () => undefined)
  return await execution
}

export async function replaceApplicationData(
  value: ApplicationData,
): Promise<ApplicationData> {
  return await enqueueApplicationDataReplacement(value, true)
}

export async function mirrorApplicationData(
  value: ApplicationData,
): Promise<ApplicationData> {
  return await enqueueApplicationDataReplacement(value, false)
}

async function enqueueApplicationDataReplacement(
  value: ApplicationData,
  commit: boolean,
): Promise<ApplicationData> {
  const replacement = mutationQueue.then(async () => {
    const candidate = ensureApplicationDataIntegrity(normalizeApplicationData(value))
    const data = commit && applicationDataCommitter
      ? await applicationDataCommitter(candidate)
      : candidate
    const fallbackBoardId = data.boards[0]?.id
    if (!fallbackBoardId) throw new Error("NewsNext must keep at least one Board")
    const settingsKey = PERSISTED_DATA_SLICES.settings.key
    const stored = await browser.storage.local.get(settingsKey)
    const settings = normalizePersistedSettings(stored[settingsKey])
    const boardIds = new Set(data.boards.map(board => board.id))
    const updates: Record<string, unknown> = {
      [PERSISTED_DATA_SLICES.application.key]: data,
    }
    if (settings.general.defaultBoardId !== null
      && !boardIds.has(settings.general.defaultBoardId)) {
      updates[settingsKey] = {
        ...settings,
        general: { ...settings.general, defaultBoardId: fallbackBoardId },
      }
    }
    await browser.storage.local.set(updates)
    return data
  })
  mutationQueue = replacement.then(() => undefined, () => undefined)
  return await replacement
}

export async function requireRegisteredSources(sourceIds: string[]): Promise<void> {
  if (sourceIds.length === 0) return
  const sources = await loadSourceDescriptors()
  const registeredSourceIds = new Set(sources.map(source => source.id))
  const missingSourceId = sourceIds.find(sourceId => !registeredSourceIds.has(sourceId))
  if (missingSourceId) throw new Error(`Source '${missingSourceId}' not found`)
}

export async function readApplicationData(): Promise<ApplicationData> {
  await mutationQueue
  return await loadApplicationData()
}

async function loadApplicationData(): Promise<ApplicationData> {
  const key = PERSISTED_DATA_SLICES.application.key
  const stored = await browser.storage.local.get(key)
  const data = normalizeApplicationData(stored[key])
  const initialized = ensureApplicationDataIntegrity(data)
  if (initialized === data) return data
  await browser.storage.local.set({ [key]: initialized })
  return initialized
}
