import type {
  ApplicationAction,
  ApplicationActionResult,
  ApplicationData,
  ApplicationNowLayerLiveCard,
  ApplicationQuery,
  ApplicationQueryResult,
} from "../application"
import { loadSourceDescriptors } from "@newsnext/source-kit/runtime"
import { browser } from "#imports"
import {
  ensureApplicationDataIntegrity,
  executeApplicationAction,
  executeApplicationQuery,
  parseApplicationAction,
  parseApplicationQuery,
} from "../application"
import { createId } from "../id"
import {
  normalizeApplicationData,
  normalizePersistedDeviceState,
  normalizePersistedSettings,
  PERSISTED_DATA_SLICES,
} from "../settings"

let mutationQueue: Promise<void> = readApplicationData().then(
  () => undefined,
  () => undefined,
)

export async function executeBackgroundApplicationAction(
  action: ApplicationAction,
): Promise<ApplicationActionResult> {
  const parsedAction = parseApplicationAction(action)
  const execution = mutationQueue.then(async () => {
    const sourceIds = parsedAction.type === "instance.create"
      ? [parsedAction.input.sourceId]
      : parsedAction.type === "collection.create"
        ? (parsedAction.input.instances ?? []).map(instance => instance.sourceId)
        : []
    if (sourceIds.length > 0) {
      const sources = await loadSourceDescriptors()
      const registeredSourceIds = new Set(sources.map(source => source.id))
      const missingSourceId = sourceIds.find(sourceId => !registeredSourceIds.has(sourceId))
      if (missingSourceId) {
        throw new Error(`Source '${missingSourceId}' not found`)
      }
    }
    const data = await readApplicationData()
    const result = executeApplicationAction(data, parsedAction, {
      createId,
      now: Date.now,
    })
    const updates: Record<string, unknown> = {
      [PERSISTED_DATA_SLICES.application.key]: result.data,
    }
    if (parsedAction.type === "collection.delete") {
      const settingsKey = PERSISTED_DATA_SLICES.settings.key
      const deviceStateKey = PERSISTED_DATA_SLICES.deviceState.key
      const stored = await browser.storage.local.get([settingsKey, deviceStateKey])
      const settings = normalizePersistedSettings(stored[settingsKey])
      const deviceState = normalizePersistedDeviceState(stored[deviceStateKey])
      const destinationBoardId = parsedAction.input.targetCollectionId
        ?? result.data.collections[0]?.id
      if (!destinationBoardId) throw new Error("NewsNext must keep at least one Board")
      if (settings.general.defaultBoardId === parsedAction.input.collectionId) {
        updates[settingsKey] = {
          ...settings,
          general: { ...settings.general, defaultBoardId: destinationBoardId },
        }
      }
      if (deviceState.currentBoardId === parsedAction.input.collectionId) {
        updates[deviceStateKey] = { ...deviceState, currentBoardId: destinationBoardId }
      }
    }
    await browser.storage.local.set(updates)
    return result.result ?? {}
  })
  mutationQueue = execution.then(() => undefined, () => undefined)
  return await execution
}

export async function replaceBackgroundApplicationData(
  value: ApplicationData,
): Promise<ApplicationData> {
  const replacement = mutationQueue.then(async () => {
    const data = ensureApplicationDataIntegrity(normalizeApplicationData(value))
    const fallbackBoardId = data.collections[0]?.id
    if (!fallbackBoardId) throw new Error("NewsNext must keep at least one Board")
    const deviceStateKey = PERSISTED_DATA_SLICES.deviceState.key
    const settingsKey = PERSISTED_DATA_SLICES.settings.key
    const stored = await browser.storage.local.get([deviceStateKey, settingsKey])
    const deviceState = normalizePersistedDeviceState(stored[deviceStateKey])
    const settings = normalizePersistedSettings(stored[settingsKey])
    const collectionIds = new Set(data.collections.map(collection => collection.id))
    const updates: Record<string, unknown> = {
      [PERSISTED_DATA_SLICES.application.key]: data,
    }
    if (!collectionIds.has(deviceState.currentBoardId)) {
      updates[deviceStateKey] = { ...deviceState, currentBoardId: fallbackBoardId }
    }
    if (settings.general.defaultBoardId !== null
      && !collectionIds.has(settings.general.defaultBoardId)) {
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

export async function executeBackgroundApplicationQuery<Query extends ApplicationQuery>(
  query: Query,
): Promise<ApplicationQueryResult<Query>> {
  const parsedQuery = parseApplicationQuery(query) as Query
  if (parsedQuery.type === "source.list" || parsedQuery.type === "source.get") {
    return executeApplicationQuery(normalizeApplicationData(undefined), parsedQuery, {
      sources: await loadSourceDescriptors(),
    })
  }
  const data = await readConnectedApplicationData()
  if (parsedQuery.type === "nowLayer.getLiveCards") {
    const result = executeApplicationQuery(data, parsedQuery, {
      currentBoardId: await readCurrentBoardId(),
    }) as ApplicationNowLayerLiveCard[]
    return result as ApplicationQueryResult<Query>
  }
  if (parsedQuery.type === "board.getContext") {
    return executeApplicationQuery(data, parsedQuery, {
      currentBoardId: await readCurrentBoardId(),
    })
  }
  return executeApplicationQuery(data, parsedQuery)
}

export async function readConnectedApplicationData(): Promise<ApplicationData> {
  await mutationQueue
  return await readApplicationData()
}

async function readApplicationData(): Promise<ApplicationData> {
  const key = PERSISTED_DATA_SLICES.application.key
  const stored = await browser.storage.local.get(key)
  const data = normalizeApplicationData(stored[key])
  const initialized = ensureApplicationDataIntegrity(data)
  if (initialized === data) return data
  await browser.storage.local.set({ [key]: initialized })
  return initialized
}

async function readCurrentBoardId(): Promise<string> {
  const key = PERSISTED_DATA_SLICES.deviceState.key
  const stored = await browser.storage.local.get(key)
  return normalizePersistedDeviceState(stored[key]).currentBoardId
}
