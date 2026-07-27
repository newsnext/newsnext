import type {
  SourceConnectionCommandRequest,
  SourceConnectionReadyResponse,
  SourceConnectionSerializedError,
} from "@newsnext/shared/types"

export const DAEMON_STATUS_PATH = "/__newsnext/status"
export const DAEMON_EXECUTE_PATH = "/__newsnext/execute"
export const DAEMON_STOP_PATH = "/__newsnext/stop"

export interface DaemonStatus {
  pid: number
  startedAt: number
  url: string
  instances: SourceConnectionReadyResponse["instance"][]
}

export interface DaemonExecuteInput {
  request: SourceConnectionCommandRequest
  browser?: string
  timeoutMs: number
}

export type DaemonExecuteResponse
  = | {
    ok: true
    data: unknown
    instance: SourceConnectionReadyResponse["instance"]
  }
  | {
    ok: false
    kind: "source"
    error: SourceConnectionSerializedError
  }
  | {
    ok: false
    kind: "daemon"
    error: {
      message: string
    }
  }

export function getDaemonEndpoint(wsUrl: URL, pathname: string): URL {
  const url = new URL(wsUrl)
  url.protocol = "http:"
  url.pathname = pathname
  url.search = ""
  url.hash = ""
  return url
}
