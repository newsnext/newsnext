import type { PersistedDeviceState } from "../settings"
import type { BackgroundActionContext } from "./background-actions"
import type { SourceConnectionStatus } from "./source-connection-native"
import { loadSourceDescriptors } from "@newsnext/source-kit/runtime"
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

export interface SourceConnectionActions {
  getStatus: () => Promise<SourceConnectionStatus>
  setEnabled: (input: {
    enabled: boolean
    frontendState?: PersistedDeviceState
  }) => Promise<SourceConnectionStatus>
}

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
    source: {
      cancel: sourceLoaderInvoker.cancel,
      load: sourceLoader.load,
    },
    sourceConnection,
  }
}
