import type { Worker } from "./protocol/Worker.js"

export type { Worker } from "./protocol/Worker.js"

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }
export interface JsonObject { [key: string]: JsonValue }
export type HistoryTime = number | string | Date

export interface CallOptions {
  /** Timeout for each daemon request (1–600000 ms). */
  timeoutMs?: number
  /** Cancels the CLI process, including when reading a stream. */
  signal?: AbortSignal
}

export interface ClientOptions extends CallOptions {
  environment?: "development" | "production"
  /** Executable followed by prefix arguments; no shell evaluation. */
  command?: readonly [string, ...string[]]
  cwd?: string
  workerId?: string
}

export interface Dataset {
  id: string
  lastObservedAt: number
  workerId: string
  observationCount: number
  params: JsonObject
  providerId: string
  sourceId: string
  sourceVersion: number
}

export interface DatasetQuery {
  cursor?: string
  limit?: number
  workerId?: string
  providerId?: string
  sourceId?: string
  sourceVersion?: number
}

export interface DatasetPage {
  datasets: Dataset[]
  hasMore: boolean
  nextCursor?: string
}

export interface Completeness {
  complete: boolean
  warnings: string[]
}

export interface ObservationSummary {
  itemCount: number
  kind: "ranking" | "timeline" | "list"
  metadata?: JsonValue
  observedAt: number
  sourceVersion: number
}

export interface ItemIdentity { providerId: string, url: string }
export interface ObservedItem { identity: ItemIdentity, position: number, value: JsonObject }
export interface Observation extends Omit<ObservationSummary, "itemCount"> { items: ObservedItem[] }
export interface ObservationResult { completeness: Completeness, dataset?: Dataset, observation?: Observation }
export interface ObservationPage {
  completeness: Completeness
  dataset?: Dataset
  hasMore: boolean
  nextCursor?: number
  observations: ObservationSummary[]
}
export interface ObservationQuery { datasetId: string, cursor?: HistoryTime, from?: HistoryTime, to?: HistoryTime, limit?: number }
export interface ExportQuery { datasetId: string, from?: HistoryTime, to?: HistoryTime }
export interface CompareQuery { datasetId: string, before: HistoryTime, after: HistoryTime }
export interface Comparison {
  completeness: Completeness
  dataset?: Dataset
  diff?: {
    added: ObservedItem[]
    missing: ObservedItem[]
    moved: { identity: ItemIdentity, beforePosition: number, afterPosition: number }[]
    updated: { identity: ItemIdentity, before: ObservedItem, after: ObservedItem, changedFields: string[] }[]
    beforeObservedAt: number
    afterObservedAt: number
  }
}
export interface Status {
  capabilities: string[]
  daemonVersion: string | null
  protocolVersion: number | null
  pid: number
  startedAt: number
  workers: Worker[]
  workspace: JsonObject
  widgetServerUrl: string
}
export interface ActionOptions extends CallOptions { workerId?: string }
