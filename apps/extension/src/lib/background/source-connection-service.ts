import type { PersistedDeviceState } from "../settings/persisted-settings"
import type { SourceConnectionStatus } from "./source-connection-websocket"
import {
  getSourceConnectionStatus,
  setSourceConnectionEnabled,
} from "./source-connection-websocket"

export interface BackgroundSourceConnectionService {
  getStatus: () => Promise<SourceConnectionStatus>
  setEnabled: (
    enabled: boolean,
    frontendState?: PersistedDeviceState,
  ) => Promise<SourceConnectionStatus>
}

export function createBackgroundSourceConnectionService(): BackgroundSourceConnectionService {
  return {
    getStatus: async () => getSourceConnectionStatus(),
    setEnabled: setSourceConnectionEnabled,
  }
}
