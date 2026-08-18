import type {
  ApplicationAction,
  ApplicationActionResult,
  ApplicationData,
  ApplicationQuery,
  ApplicationQueryResult,
  ApplicationVisibleLiveCard,
} from "../application"
import { loadSourceDescriptors } from "@newsnext/source/runtime"
import { browser } from "#imports"
import {
  executeApplicationAction,
  executeApplicationQuery,
  parseApplicationAction,
  parseApplicationQuery,
} from "../application"
import { ALL_BOARD_ID } from "../board"
import { createId } from "../id"
import {
  normalizeApplicationData,
  normalizePersistedDeviceState,
  normalizePersistedSettings,
  PERSISTED_DATA_SLICES,
} from "../settings"

let mutationQueue: Promise<void> = Promise.resolve()

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
      if (settings.general.defaultBoardId === parsedAction.input.collectionId) {
        updates[settingsKey] = {
          ...settings,
          general: { ...settings.general, defaultBoardId: ALL_BOARD_ID },
        }
      }
      if (deviceState.currentBoardId === parsedAction.input.collectionId) {
        updates[deviceStateKey] = { ...deviceState, currentBoardId: ALL_BOARD_ID }
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
    const data = normalizeApplicationData(value)
    const deviceStateKey = PERSISTED_DATA_SLICES.deviceState.key
    const settingsKey = PERSISTED_DATA_SLICES.settings.key
    const stored = await browser.storage.local.get([deviceStateKey, settingsKey])
    const deviceState = normalizePersistedDeviceState(stored[deviceStateKey])
    const settings = normalizePersistedSettings(stored[settingsKey])
    const collectionIds = new Set(data.collections.map(collection => collection.id))
    const updates: Record<string, unknown> = {
      [PERSISTED_DATA_SLICES.application.key]: data,
    }
    if (deviceState.currentBoardId !== ALL_BOARD_ID
      && !collectionIds.has(deviceState.currentBoardId)) {
      updates[deviceStateKey] = { ...deviceState, currentBoardId: ALL_BOARD_ID }
    }
    if (settings.general.defaultBoardId !== null
      && settings.general.defaultBoardId !== ALL_BOARD_ID
      && !collectionIds.has(settings.general.defaultBoardId)) {
      updates[settingsKey] = {
        ...settings,
        general: { ...settings.general, defaultBoardId: ALL_BOARD_ID },
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
  if (parsedQuery.type === "view.getVisibleLiveCards") {
    const result = executeApplicationQuery(data, parsedQuery, {
      currentBoardId: await readCurrentBoardId(),
    }) as ApplicationVisibleLiveCard[]
    const sourceIds = new Set((await loadSourceDescriptors()).map(source => source.id))
    return result.filter(liveCard => sourceIds.has(liveCard.sourceId)) as ApplicationQueryResult<Query>
  }
  if (parsedQuery.type === "view.getContext") {
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
  return normalizeApplicationData(stored[key])
}

async function readCurrentBoardId(): Promise<string> {
  const key = PERSISTED_DATA_SLICES.deviceState.key
  const stored = await browser.storage.local.get(key)
  return normalizePersistedDeviceState(stored[key]).currentBoardId
}
