import type { Static, TProperties, TSchema } from "typebox"
import Type from "typebox"
import Value from "typebox/value"

/** Increment for breaking wire changes; negotiate additive features through capabilities. */
export const PROTOCOL_VERSION = 40

const text = Type.String()
const id = Type.String({ minLength: 1 })
const uint = Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER })
const positive = Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER })
const ids = Type.Array(id, { uniqueItems: true })
const record = Type.Record(text, Type.Unknown())
const payload = Type.Object({}, { additionalProperties: true })
const nullable = <T extends TSchema>(schema: T) => Type.Union([schema, Type.Null()])
const object = <T extends TProperties>(properties: T) => Type.Object(properties, { additionalProperties: false })
// Responses may add fields without breaking peers using the same protocol version.
const response = <T extends TProperties>(properties: T) => Type.Object(properties, { additionalProperties: true })
const strings = Type.Array(text)

export const workerSchema = object({ id, browser: id, extensionVersion: id })
export const offlineWorkerSchema = response({ id, cardIds: Type.Array(id, { minItems: 1, uniqueItems: true }) })
export const longTaskProgressSchema = response({
  id: text,
  label: text,
  stage: text,
  completedSteps: uint,
  totalSteps: positive,
  startedAt: uint,
  elapsedMs: uint,
})
export const insightCatalogEntrySchema = response({
  id,
  title: text,
  color: text,
  width: positive,
  height: positive,
  minWidth: positive,
  minHeight: positive,
  /** Entry document served by the loopback Insight server; built-in views use `view`. */
  url: Type.Optional(text),
  view: Type.Optional(Type.Unknown()),
  params: Type.Unknown(),
  dataRevision: text,
  dataFiles: strings,
  /** Fingerprint of the custom entry document or built-in view definition. */
  viewRevision: text,
  /** False when the Insight declares neither queries nor data.mjs. */
  hasData: Type.Boolean(),
  refreshIntervalMs: uint,
})
export const insightCatalogSchema = Type.Array(insightCatalogEntrySchema)
export const logLevelSchema = Type.Union([Type.Literal("error"), Type.Literal("warn"), Type.Literal("info")])
export const logEntrySchema = response({ id: uint, timestamp: text, level: logLevelSchema, target: text, message: text })
export const logsSchema = Type.Array(logEntrySchema)
export const collectionActivitySchema = Type.Union([
  Type.Literal("loading"),
  Type.Literal("offline"),
  Type.Literal("backoff"),
  Type.Literal("due"),
  Type.Literal("scheduled"),
])
export const collectionOutcomeSchema = Type.Union([Type.Literal("fresh"), Type.Literal("cached"), Type.Literal("error")])
export const collectionPolicyStatusSchema = response({
  intervalMs: Type.Integer({ minimum: 60_000, maximum: 3_600_000 }),
  nextRunAt: uint,
  lastFetchedAt: nullable(uint),
  lastAttemptAt: nullable(uint),
  lastChangedAt: nullable(uint),
  lastError: nullable(text),
  lastOutcome: nullable(collectionOutcomeSchema),
  added: uint,
  removed: uint,
  edited: uint,
  moved: uint,
})
export const streamStatusSchema = response({
  streamId: text,
  sourceId: text,
  workerId: text,
  cardIds: strings,
  resolved: Type.Boolean(),
  observationCount: Type.Optional(nullable(uint)),
  activity: collectionActivitySchema,
  policy: collectionPolicyStatusSchema,
})
export const collectionStatusSchema = response({
  initialized: Type.Boolean(),
  sampledAt: uint,
  persistenceError: nullable(text),
  pendingWrites: uint,
  streams: Type.Array(streamStatusSchema),
})
export const boardLayerSchema = Type.Union([Type.Literal("now"), Type.Literal("next")])
/** Array order is display order. */
export const nowLayerSchema = object({ liveCards: ids })
export const nextLayerSchema = object({ liveWidgets: ids })
export const widgetMetadataSchema = object({
  badge: Type.Optional(text),
  desc: Type.Optional(text),
  home: Type.Optional(text),
  title: Type.Optional(text),
  color: Type.Optional(text),
})
export const widgetPatchSchema = object({ metadata: Type.Optional(widgetMetadataSchema), params: Type.Optional(record) })
export const liveWidgetDataScopeSchema = Type.Union([
  object({ type: Type.Literal("board") }),
  object({ type: Type.Literal("cards"), cardIds: ids }),
])
/** Size in half-LiveCard units; placement follows the Board's array order. */
export const liveWidgetLayoutSchema = object({ height: uint, width: uint })
export const liveWidgetSchema = object({
  patch: Type.Optional(widgetPatchSchema),
  dataScope: liveWidgetDataScopeSchema,
  layout: liveWidgetLayoutSchema,
  insightId: id,
  liveWidgetId: id,
})
export const workspaceBoardSchema = object({
  color: id,
  createdAt: uint,
  layer: boardLayerSchema,
  id,
  name: id,
  nowLayer: nowLayerSchema,
  nextLayer: nextLayerSchema,
})
export const workspaceLiveCardSchema = object({
  createdAt: uint,
  cardId: id,
  workerId: id,
  patch: payload,
  provider: Type.Optional(Type.Unknown()),
  sourceId: id,
})
const workspaceData = {
  updatedAt: uint,
  boardOrder: ids,
  boards: Type.Record(text, workspaceBoardSchema),
  liveCards: Type.Record(text, workspaceLiveCardSchema),
  liveWidgets: Type.Record(text, liveWidgetSchema),
  settings: text,
}
export const workspaceSchema = object({ revision: uint, ...workspaceData })
export const workspacePatchSchema = object({ expectedRevision: uint, ...workspaceData })
export const workspaceCommitParamsSchema = object({ patch: workspacePatchSchema })
export const workspaceCommitResultSchema = object({ revision: positive, localCardIds: ids })
export const workerTakeoverParamsSchema = object({ workerId: id, cardIds: ids })
export const liveCardObservedParamsSchema = object({ cardId: id, result: payload })
export const liveCardSnapshotGetParamsSchema = object({ cardId: id, snapshotOnly: Type.Boolean() })
export const collectionStatusSubscribeParamsSchema = object({ enabled: Type.Boolean() })
export const logsSubscribeParamsSchema = object({ enabled: Type.Boolean() })
export const logsSetLevelParamsSchema = object({
  level: Type.Union([Type.Literal("off"), Type.Literal("info"), Type.Literal("warn"), Type.Literal("error")]),
})
export const sdkOpenParamsSchema = object({ streamId: id, request: record })
export const sdkStreamParamsSchema = object({ streamId: id })
export const serializedErrorSchema = object({
  name: text,
  message: text,
  stack: Type.Optional(text),
  code: Type.Optional(text),
  loginUrl: Type.Optional(text),
})
export const commandResultSchema = Type.Union([
  object({ ok: Type.Literal(true), data: Type.Optional(Type.Unknown()) }),
  object({ ok: Type.Literal(false), error: serializedErrorSchema }),
])
export const extensionCommandSchema = Type.Union([
  object({ type: Type.Literal("source.context"), id, executionId: id, operation: record }),
  object({ type: Type.Literal("action.list"), id }),
  object({ type: Type.Literal("action.execute"), id, name: id, input: record }),
])
const rpc = object({ type: Type.Literal("rpc"), message: Type.Unknown() })
export const nativeHelloSchema = object({ type: Type.Literal("hello"), protocolVersion: uint, worker: workerSchema, workspace: workspaceSchema })
export const workerRegisterSchema = object({ type: Type.Literal("register"), protocolVersion: uint, worker: workerSchema, workspace: workspaceSchema })
export const extensionToHostSchema = Type.Union([rpc, nativeHelloSchema])
export const nativeChunkSchema = object({ type: Type.Literal("chunk"), transferId: id, index: uint, total: Type.Integer({ minimum: 1, maximum: 256 }), data: text })
export const localProvidersSchema = Type.Record(text, record)
export const hostToExtensionSchema = Type.Union([
  response({ type: Type.Literal("initializing"), protocolVersion: uint, daemonVersion: text, pid: positive, progress: nullable(longTaskProgressSchema), logs: logsSchema }),
  rpc,
  nativeChunkSchema,
  response({
    type: Type.Literal("ready"),
    protocolVersion: uint,
    daemonVersion: text,
    capabilities: strings,
    insightServerUrl: text,
    insights: insightCatalogSchema,
    workspace: workspaceSchema,
    localCardIds: ids,
    workerRoutingRevision: uint,
    offlineWorkers: Type.Array(offlineWorkerSchema),
    localSources: localProvidersSchema,
  }),
  response({ type: Type.Literal("error"), requestId: nullable(text), code: Type.Optional(text), message: text }),
])
export const nativeNotificationSchema = Type.Union([
  response({ method: Type.Literal("workerRoutingChanged"), params: response({ revision: uint, localCardIds: ids, offlineWorkers: Type.Array(offlineWorkerSchema) }) }),
  response({ method: Type.Literal("workspaceChanged"), params: response({ patch: workspacePatchSchema, localCardIds: ids }) }),
  response({ method: Type.Literal("collectionStatusChanged"), params: response({ status: collectionStatusSchema }) }),
  response({ method: Type.Literal("logsChanged"), params: response({ entries: logsSchema }) }),
  response({ method: Type.Literal("insightCatalogChanged"), params: response({ insights: insightCatalogSchema }) }),
  response({ method: Type.Literal("localSourcesChanged"), params: response({ providers: localProvidersSchema }) }),
])

const empty = object({})
const nothing = Type.Null()
/** Native RPC contracts shared by the host and extension. Domain payloads are validated by their owner. */
export const nativeMethods = {
  "localSourceLoad": { params: object({ sourceId: id, executionId: id, params: record, secrets: record }), result: Type.Unknown() },
  "rankingPositionsGet": {
    params: object({ cardId: id, sourceVersion: uint, params: record, url: id }),
    result: Type.Array(object({ observedAt: uint, position: nullable(uint) })),
  },
  "collectionStatusSubscribe": { params: collectionStatusSubscribeParamsSchema, result: nothing },
  "sdk.open": { params: sdkOpenParamsSchema, result: nothing },
  "sdk.next": { params: sdkStreamParamsSchema, result: Type.Unknown() },
  "sdk.cancel": { params: sdkStreamParamsSchema, result: nothing },
  "logsGet": { params: empty, result: logsSchema },
  "logsSetLevel": { params: logsSetLevelParamsSchema, result: nothing },
  "logsSubscribe": { params: logsSubscribeParamsSchema, result: nothing },
  "collectionStatusGet": { params: empty, result: collectionStatusSchema },
  "liveCardSnapshotGet": { params: liveCardSnapshotGetParamsSchema, result: Type.Unknown() },
  "liveCardObserved": { params: liveCardObservedParamsSchema, result: nothing },
  "workspaceCommit": { params: workspaceCommitParamsSchema, result: workspaceCommitResultSchema },
  "workerTakeover": { params: workerTakeoverParamsSchema, result: nothing },
  "restart": { params: empty, result: nothing },
}
export type NativeMethods = { [Method in keyof typeof nativeMethods]: {
  params: Static<(typeof nativeMethods)[Method]["params"]>
  result: Static<(typeof nativeMethods)[Method]["result"]>
} }

/** Validate wire data without coercion or defaults. Relational/domain checks remain with their owner. */
export function parseNativeValue<T extends TSchema>(schema: T, value: unknown): Static<T> {
  if (!Value.Check(schema, value)) {
    const issue = Value.Errors(schema, value)[0]
    throw new TypeError(`Invalid native protocol value${issue?.instancePath ?? ""}: ${issue?.message ?? "schema mismatch"}`)
  }
  return value
}

export function parseHostMessage(value: unknown): HostToExtension {
  const message = parseNativeValue(hostToExtensionSchema, value)
  if (message.type === "initializing" && message.progress && message.progress.completedSteps > message.progress.totalSteps) {
    throw new TypeError("Invalid native task progress: completed steps exceed total steps")
  }
  return message
}
export function parseCollectionStatus(value: unknown): CollectionStatus {
  return parseNativeValue(collectionStatusSchema, value)
}
export function parseLogs(value: unknown): LogEntry[] {
  return parseNativeValue(logsSchema, value)
}
export function parseWorkspacePatch(value: unknown): WorkspacePatch {
  return parseNativeValue(workspacePatchSchema, value)
}

export type Worker = Static<typeof workerSchema>
export type OfflineWorker = Static<typeof offlineWorkerSchema>
export type LongTaskProgress = Static<typeof longTaskProgressSchema>
export type InsightCatalogEntry = Static<typeof insightCatalogEntrySchema>
export type LogLevel = Static<typeof logLevelSchema>
export type LogEntry = Static<typeof logEntrySchema>
export type CollectionActivity = Static<typeof collectionActivitySchema>
export type CollectionOutcome = Static<typeof collectionOutcomeSchema>
export type CollectionPolicyStatus = Static<typeof collectionPolicyStatusSchema>
export type StreamStatus = Static<typeof streamStatusSchema>
export type CollectionStatus = Static<typeof collectionStatusSchema>
export type BoardLayer = Static<typeof boardLayerSchema>
export type NowLayer = Static<typeof nowLayerSchema>
export type NextLayer = Static<typeof nextLayerSchema>
export type WidgetMetadata = Static<typeof widgetMetadataSchema>
export type WidgetPatch = Static<typeof widgetPatchSchema>
export type LiveWidgetDataScope = Static<typeof liveWidgetDataScopeSchema>
export type LiveWidgetLayout = Static<typeof liveWidgetLayoutSchema>
export type LiveWidget = Static<typeof liveWidgetSchema>
export type WorkspaceBoard = Static<typeof workspaceBoardSchema>
export type WorkspaceLiveCard = Static<typeof workspaceLiveCardSchema>
export type Workspace = Static<typeof workspaceSchema>
export type WorkspacePatch = Static<typeof workspacePatchSchema>
export type WorkspaceCommitParams = Static<typeof workspaceCommitParamsSchema>
export type WorkspaceCommitResult = Static<typeof workspaceCommitResultSchema>
export type WorkerTakeoverParams = Static<typeof workerTakeoverParamsSchema>
export type LiveCardObservedParams = Static<typeof liveCardObservedParamsSchema>
export type LiveCardSnapshotGetParams = Static<typeof liveCardSnapshotGetParamsSchema>
export type CollectionStatusSubscribeParams = Static<typeof collectionStatusSubscribeParamsSchema>
export type LogsSubscribeParams = Static<typeof logsSubscribeParamsSchema>
export type LogsSetLevelParams = Static<typeof logsSetLevelParamsSchema>
export type SdkOpenParams = Static<typeof sdkOpenParamsSchema>
export type SdkStreamParams = Static<typeof sdkStreamParamsSchema>
export type SerializedError = Static<typeof serializedErrorSchema>
export type CommandResult = Static<typeof commandResultSchema>
export type ExtensionCommand = Static<typeof extensionCommandSchema>
export type ExtensionToHost = Static<typeof extensionToHostSchema>
export type HostToExtension = Static<typeof hostToExtensionSchema>
export type NativeNotification = Static<typeof nativeNotificationSchema>
