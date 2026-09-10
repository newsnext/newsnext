import type { LiveCard } from "../source"
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

export interface BackgroundActionDependencies {
  liveCardRouter: BackgroundActionContext["liveCardRouter"]
  nativeIntegration: BackgroundActionContext["nativeIntegration"]
  workerManagement: BackgroundActionContext["workerManagement"]
}

const sourceLoaderInvoker = createSourceLoaderInvoker()
const sourceLoader = createProtectedSourceLoader(sourceLoaderInvoker)
const radarService = createBackgroundRadarService()

async function loadBoundLiveCard({ card }: { card: LiveCard }) {
  return sourceLoader.load({ params: card.patch.params, sourceId: card.sourceId })
}

async function readBoundLiveCardCache({ card }: { card: LiveCard }) {
  const request = await prepareSourceRequest(card.sourceId, card.patch.params ?? {})
  const persisted = await readPersistedSourceResult({
    params: request.params,
    sourceId: card.sourceId,
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
  dependencies: BackgroundActionDependencies,
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
    loader: {
      loadLiveCard: loadBoundLiveCard,
      readLiveCardCache: readBoundLiveCardCache,
    },
    source: {
      cancel: sourceLoaderInvoker.cancel,
      load: sourceLoader.load,
    },
    ...dependencies,
  }
}
