import type { SourceConnectionStatus } from "./source-connection-websocket"
import { getSourceConnectionStatus } from "./source-connection-websocket"

export interface BackgroundSourceConnectionService {
  getStatus: () => Promise<SourceConnectionStatus>
}

export function createBackgroundSourceConnectionService(): BackgroundSourceConnectionService {
  return {
    getStatus: async () => getSourceConnectionStatus(),
  }
}
