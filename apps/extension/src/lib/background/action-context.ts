import type { BackgroundActionContext } from "./background-actions"
import { loadSourceDescriptors, prepareSourceRequest } from "@newsnext/source-kit/runtime"
import { openAppBoard, openAppSettings } from "../app-tab"
import { readPersistedSourceResult, writePersistedSourceResult } from "../source/persisted-results"
import {
  mutateApplicationData,
  readApplicationData,
  readCurrentBoardId,
  replaceApplicationData,
  requireRegisteredSources,
  selectCurrentBoard,
} from "./application-service"
import {
  authorizeConnectedSource,
  executeConnectedFetch,
} from "./connected-actions"
import { runDeveloperSource } from "./developer-source-runner"
import { createProtectedSourceLoader } from "./protected-source-loader"
import { createBackgroundRadarService } from "./radar-service"
import { createSourceLoaderInvoker } from "./source-loader-invoker"

export type SourceConnectionActions = BackgroundActionContext["sourceConnection"]

const sourceLoaderInvoker = createSourceLoaderInvoker()
const sourceLoader = createProtectedSourceLoader(sourceLoaderInvoker)
const radarService = createBackgroundRadarService()

async function requireOwnedInstance(instanceId: string) {
  const application = await readApplicationData()
  const instance = application.instances.find(candidate => candidate.instanceId === instanceId)
  if (!instance) throw new Error(`Instance '${instanceId}' not found`)
  return instance
}

async function executeOwnedInstance({ instanceId }: { instanceId: string }) {
  const instance = await requireOwnedInstance(instanceId)
  const response = await sourceLoader.load({
    params: instance.patch.params,
    sourceId: instance.sourceId,
  })
  return { instance, response }
}

async function loadNodeInstance(input: { instanceId: string }) {
  const { instance, response } = await executeOwnedInstance(input)
  await writePersistedSourceResult({
    instanceId: instance.instanceId,
    params: response.params,
    sourceId: instance.sourceId,
    version: response.result.source.version,
  }, response.result, response.fetchedAt)
  return response
}

async function readNodeInstanceCache({ instanceId }: { instanceId: string }) {
  const instance = await requireOwnedInstance(instanceId)
  const request = await prepareSourceRequest(instance.sourceId, instance.patch.params ?? {})
  const persisted = await readPersistedSourceResult({
    instanceId,
    params: request.params,
    sourceId: instance.sourceId,
    version: request.source.version,
  })
  if (!persisted) return null

  return {
    fetchProtected: true,
    fetchedAt: persisted.fetchedAt,
    loadedAt: Date.now(),
    params: request.params,
    result: persisted.result,
  }
}

export function createBackgroundActionContext(
  sourceConnection: SourceConnectionActions,
): BackgroundActionContext {
  return {
    currentBoardId: readCurrentBoardId,
    data: readApplicationData,
    mutate: mutateApplicationData,
    replace: replaceApplicationData,
    requireSources: requireRegisteredSources,
    sources: loadSourceDescriptors,
    app: {
      async open(input) {
        if ("settings" in input) {
          await openAppSettings()
        } else {
          await selectCurrentBoard(input.boardId)
          await openAppBoard(input.boardId)
        }
        return {}
      },
    },
    developer: {
      fetch: executeConnectedFetch,
      runSource: input => runDeveloperSource(input, authorizeConnectedSource),
    },
    radar: {
      resolveSuggestions: radarService.resolveSuggestions,
    },
    job: {
      async executeInstance(input) {
        return (await executeOwnedInstance(input)).response
      },
    },
    node: {
      loadInstance: loadNodeInstance,
      readInstanceCache: readNodeInstanceCache,
    },
    source: {
      cancel: sourceLoaderInvoker.cancel,
      load: sourceLoader.load,
    },
    sourceConnection,
  }
}
