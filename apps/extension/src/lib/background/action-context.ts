import type { LiveCard } from "../source"
import type { BackgroundActionContext } from "./background-actions"
import { loadSourceDescriptors } from "@newsnext/source-kit/runtime"
import { readLiveCardSnapshotResponse, writeLiveCardSnapshot } from "../source/source-snapshot"
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
  const response = await sourceLoader.load({ params: card.patch.params, sourceId: card.sourceId })
  await writeLiveCardSnapshot(card.cardId, response)
  return response
}

async function readBoundLiveCardSnapshot({ card }: { card: LiveCard }) {
  const snapshot = await readLiveCardSnapshotResponse(card.cardId)
  return snapshot?.result.source.id === card.sourceId ? snapshot : null
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
      readLiveCardSnapshot: readBoundLiveCardSnapshot,
    },
    source: {
      cancel: sourceLoaderInvoker.cancel,
      load: sourceLoader.load,
    },
    ...dependencies,
  }
}
