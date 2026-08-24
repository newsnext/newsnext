import type { BackgroundActionContext } from "./background-actions"
import { loadSourceDescriptors, prepareSourceRequest } from "@newsnext/source-kit/runtime"
import { openAppBoard, openAppSettings } from "../app-tab"
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
      async executeInstance({ instanceId }) {
        const application = await readApplicationData()
        const instance = application.instances.find(candidate => candidate.instanceId === instanceId)
        if (!instance) throw new Error(`Instance '${instanceId}' not found`)
        const request = await prepareSourceRequest(instance.sourceId, instance.patch.params ?? {})
        const result = await sourceLoaderInvoker.invoke({
          params: request.params,
          sourceId: instance.sourceId,
        })
        const fetchedAt = Date.now()
        return {
          fetchProtected: false,
          fetchedAt,
          loadedAt: Date.now(),
          params: request.params,
          result,
        }
      },
    },
    source: {
      cancel: sourceLoaderInvoker.cancel,
      load: sourceLoader.load,
    },
    sourceConnection,
  }
}
