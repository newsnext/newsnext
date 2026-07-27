interface SourceConnectionRunRequestBase {
  id: string
  type: "source.run"
  sourceId: string
  params?: Record<string, unknown>
}

export interface SourceConnectionRegisteredRunRequest extends SourceConnectionRunRequestBase {
  providerId?: never
  provider?: never
  useProviderSecrets?: never
}

export interface SourceConnectionProviderRunRequest extends SourceConnectionRunRequestBase {
  providerId: string
  provider: unknown
  useProviderSecrets?: boolean
}

export type SourceConnectionRunRequest
  = | SourceConnectionRegisteredRunRequest
    | SourceConnectionProviderRunRequest

export interface SourceConnectionListRequest {
  id: string
  type: "source.list"
}

export type SourceConnectionCommandRequest
  = | SourceConnectionListRequest
    | SourceConnectionRunRequest

export interface SourceConnectionSerializedError {
  message: string
  name: string
  stack?: string
  code?: string
  loginUrl?: string
}

export interface SourceConnectionReadyResponse {
  type: "ready"
  instance: {
    id: string
    browser: string
    extensionVersion: string
  }
}

export type SourceConnectionRequest
  = | SourceConnectionCommandRequest
    | {
      id?: string
      type: "ping"
    }

export type SourceConnectionResponse
  = | {
    id: string
    type: "source.result"
    ok: true
    data: unknown
  }
  | {
    id: string
    type: "source.result"
    ok: false
    error: SourceConnectionSerializedError
  }
  | {
    id?: string
    type: "pong"
  }
  | {
    type: "ping"
  }
  | SourceConnectionReadyResponse
