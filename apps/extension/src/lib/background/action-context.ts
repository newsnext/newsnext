import type { Instance } from "../source"
import type { BackgroundActionContext } from "./background-actions"
import { loadSourceDescriptors, prepareSourceRequest } from "@newsnext/source-kit/runtime"
import { readPersistedSourceResult } from "../source/persisted-results"
import {
  mutateApplicationData,
  readApplicationData,
  replaceApplicationData,
  requireRegisteredSources,
} from "./application-service"
import {
  authorizeConnectedSource,
  executeConnectedFetch,
} from "./connected-actions"
import { runDeveloperSource } from "./developer-source-runner"
import { createProtectedSourceLoader } from "./protected-source-loader"
import { createBackgroundRadarService } from "./radar-service"
import { createSourceLoaderInvoker } from "./source-loader-invoker"

export type AppIntegrationActions = BackgroundActionContext["appIntegration"]

const sourceLoaderInvoker = createSourceLoaderInvoker()
const sourceLoader = createProtectedSourceLoader(sourceLoaderInvoker)
const radarService = createBackgroundRadarService()

async function executeInstance({ instance }: { instance: Instance }) {
  const response = await sourceLoader.load({
    params: instance.patch.params,
    sourceId: instance.sourceId,
  })
  return { instance, response }
}

async function loadBoundInstance(input: { instance: Instance }) {
  return (await executeInstance(input)).response
}

async function readBoundInstanceCache({ instance }: { instance: Instance }) {
  const request = await prepareSourceRequest(instance.sourceId, instance.patch.params ?? {})
  const persisted = await readPersistedSourceResult({
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
  appIntegration: AppIntegrationActions,
): BackgroundActionContext {
  return {
    data: readApplicationData,
    mutate: mutateApplicationData,
    replace: replaceApplicationData,
    requireSources: requireRegisteredSources,
    sources: loadSourceDescriptors,
    developer: {
      fetch: executeConnectedFetch,
      runSource: input => runDeveloperSource(input, authorizeConnectedSource),
    },
    radar: {
      resolveSuggestions: radarService.resolveSuggestions,
    },
    job: {
      async executeInstance(input) {
        return (await executeInstance(input)).response
      },
    },
    loader: {
      loadInstance: loadBoundInstance,
      readInstanceCache: readBoundInstanceCache,
    },
    source: {
      cancel: sourceLoaderInvoker.cancel,
      load: sourceLoader.load,
    },
    appIntegration,
  }
}
