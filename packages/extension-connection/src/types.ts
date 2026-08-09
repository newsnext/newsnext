interface ExtensionConnectionRunRequestBase {
  id: string
  type: "source.run"
  sourceId: string
  params?: Record<string, unknown>
}

export interface ExtensionConnectionRegisteredRunRequest extends ExtensionConnectionRunRequestBase {
  providerId?: never
  provider?: never
  useProviderSecrets?: never
}

export interface ExtensionConnectionProviderRunRequest extends ExtensionConnectionRunRequestBase {
  providerId: string
  provider: unknown
  useProviderSecrets?: boolean
}

export type ExtensionConnectionRunRequest
  = | ExtensionConnectionRegisteredRunRequest
    | ExtensionConnectionProviderRunRequest

export interface ExtensionConnectionListRequest {
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

export type ExtensionConnectionCommandRequest
  = | ExtensionConnectionListRequest
    | ExtensionConnectionRunRequest
    | SourceHistoryCommandRequest

export interface ExtensionConnectionInstance {
  id: string
  browser: string
  extensionVersion: string
}

export interface ExtensionConnectionSerializedError {
  message: string
  name: string
  stack?: string
  code?: string
  loginUrl?: string
}

export type ExtensionConnectionCommandResult
  = | {
    id: string
    ok: true
    data?: unknown
  }
  | {
    id: string
    ok: false
    error: ExtensionConnectionSerializedError
  }
