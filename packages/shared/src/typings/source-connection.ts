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

interface SourceHistoryRequestBase {
  id: string
}

export interface SourceHistoryListDatasetsRequest extends SourceHistoryRequestBase {
  type: "source-history.datasets"
  cursor?: string
  limit?: number
  providerId?: string
  sourceId?: string
}

interface SourceHistoryDatasetRequestBase extends SourceHistoryRequestBase {
  sourceId: string
  params?: Record<string, unknown>
}

export interface SourceHistoryListObservationsRequest extends SourceHistoryDatasetRequestBase {
  type: "source-history.observations"
  cursor?: number
  from?: number
  limit?: number
  to?: number
}

export interface SourceHistoryGetObservationRequest extends SourceHistoryDatasetRequestBase {
  type: "source-history.get"
  observedAt: number
}

export interface SourceHistoryCompareObservationsRequest extends SourceHistoryDatasetRequestBase {
  type: "source-history.compare"
  after: number
  before: number
}

export type SourceHistoryCommandRequest
  = | SourceHistoryListDatasetsRequest
    | SourceHistoryListObservationsRequest
    | SourceHistoryGetObservationRequest
    | SourceHistoryCompareObservationsRequest

export type SourceConnectionCommandRequest
  = | SourceConnectionListRequest
    | SourceConnectionRunRequest
    | SourceHistoryCommandRequest

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
