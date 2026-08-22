import type { PersistedDeviceState } from "../settings"
import type { BackgroundActionContext } from "./background-actions"
import type { SourceConnectionStatus } from "./source-connection-native"
import { loadSourceDescriptors } from "@newsnext/source-kit/runtime"
import { openAppBoard } from "../app-tab"
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
import { createBackgroundRadarService } from "./radar-service"
import { runConnectedSource } from "./source-runner"
import { createBackgroundSourceService } from "./source-service"

export interface SourceConnectionActions {
  getStatus: () => Promise<SourceConnectionStatus>
  setEnabled: (input: {
    enabled: boolean
    frontendState?: PersistedDeviceState
  }) => Promise<SourceConnectionStatus>
}

const sourceService = createBackgroundSourceService()
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
      async open({ boardId }) {
        await selectCurrentBoard(boardId)
        await openAppBoard(boardId)
        return {}
      },
    },
    developer: {
      fetch: executeConnectedFetch,
    },
    radar: {
      resolveSuggestions: radarService.resolveSuggestions,
    },
    source: {
      cancel: sourceService.cancel,
      load: sourceService.load,
      run: input => runConnectedSource(input, authorizeConnectedSource),
    },
    sourceConnection,
  }
}
