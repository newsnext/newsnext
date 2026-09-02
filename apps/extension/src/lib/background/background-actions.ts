import type { ExtensionConnectionFetchResponse, NativeLogEntry } from "@newsnext/extension-connection"
import type { ResolvedRadarSuggestion } from "../radar"
import type { Instance } from "../source"
import type { SourceLoadResponse } from "../source/load-result"
import type { AppIntegrationStatus } from "./app-integration-native"
import type { ApplicationActionContext } from "./application-actions"
import type {
  RunDeveloperSourceInput,
  RunDeveloperSourceOutput,
} from "./developer-source-runner"
import Type from "typebox"
import { defineAction } from "../action"
import { MAX_BG_ILLUSTRATION_DATA_URL_LENGTH } from "../bg-illustration/config"
import {
  createBgIllustrationId,
  decodeBgIllustration,
  encodeBgIllustration,
} from "../bg-illustration/persisted-illustration"

export interface ConnectedFetchInput {
  body?: string
  headers: [string, string][]
  method: string
  timeoutMs: number
  url: string
}

export interface BackgroundActionContext extends ApplicationActionContext {
  developer: {
    fetch: (input: ConnectedFetchInput) => Promise<ExtensionConnectionFetchResponse>
    runSource: (input: RunDeveloperSourceInput) => Promise<RunDeveloperSourceOutput>
  }
  radar: {
    resolveSuggestions: (input: {
      tabId: number
      title?: string
      url: string
    }) => Promise<ResolvedRadarSuggestion[]>
  }
  job: {
    executeInstance: (input: { instance: Instance }) => Promise<SourceLoadResponse>
  }
  loader: {
    loadInstance: (input: { instance: Instance }) => Promise<SourceLoadResponse>
    readInstanceCache: (input: { instance: Instance }) => Promise<SourceLoadResponse | null>
  }
  source: {
    cancel: (input: { requestId: string }) => Promise<void>
    load: (input: {
      params?: Record<string, unknown>
      requestId?: string
      sourceId: string
    }) => Promise<SourceLoadResponse>
  }
  appIntegration: {
    getIllustration: (input: { id: string }) => Promise<Uint8Array<ArrayBuffer> | null>
    getLogs: () => Promise<NativeLogEntry[]>
    getStatus: () => Promise<AppIntegrationStatus>
    getWidgetSnapshot: (input: {
      boardId: string
      widgetId: string
    }) => Promise<unknown>
    loadInstance: (input: { instanceId: string }) => Promise<SourceLoadResponse>
    readInstanceCache: (input: { instanceId: string }) => Promise<SourceLoadResponse | null>
    putIllustration: (input: {
      bytes: Uint8Array<ArrayBuffer>
      id: string
    }) => Promise<void>
    regenerateWorker: () => Promise<AppIntegrationStatus>
    setEnabled: (input: { enabled: boolean }) => Promise<AppIntegrationStatus>
    setWorker: (input: { workerId: string }) => Promise<AppIntegrationStatus>
  }
}

const UI_ONLY = ["ui"] as const
const CONNECTED_ONLY = ["connected"] as const
const UI_AND_CONNECTED = ["ui", "connected"] as const
const EmptyParams = Type.Object({}, { additionalProperties: false })
const EmptyResult = Type.Object({}, { additionalProperties: false })
const Identifier = Type.String({ minLength: 1 })
const RecordValue = Type.Record(Type.String(), Type.Unknown())
const SourceLoadResponseResult = Type.Unsafe<SourceLoadResponse>(Type.Object({
  fetchProtected: Type.Boolean(),
  fetchedAt: Type.Number(),
  loadedAt: Type.Number(),
  params: RecordValue,
  result: Type.Object({}, { additionalProperties: true }),
}, { additionalProperties: false }))
const SourceCacheResult = Type.Unsafe<SourceLoadResponse | null>(Type.Union([
  SourceLoadResponseResult,
  Type.Null(),
]))
const AppIntegrationStatusResult = Type.Unsafe<AppIntegrationStatus>(Type.Object({
  appVersion: Type.Optional(Type.String()),
  capabilities: Type.Array(Type.String()),
  claimableWorkerIds: Type.Array(Identifier),
  connectionError: Type.Optional(Type.Object({
    code: Type.Optional(Type.String()),
    message: Type.String(),
  }, { additionalProperties: false })),
  state: stringEnum([
    "disabled",
    "connected",
    "connecting",
    "daemonOutdated",
    "hostNotInstalled",
    "protocolIncompatible",
    "serviceNotRunning",
    "workerConflict",
  ] as const),
  workerId: Identifier,
  widgetServerUrl: Type.Optional(Type.String()),
}, { additionalProperties: false }))
const InstanceParams = Type.Unsafe<Instance>(Type.Object({
  createdAt: Type.Number(),
  instanceId: Identifier,
  patch: Type.Object({}, { additionalProperties: true }),
  sourceId: Identifier,
}, { additionalProperties: false }))
const RoutedInstanceParams = Type.Object({ instance: InstanceParams }, { additionalProperties: false })
const FetchParams = Type.Unsafe<ConnectedFetchInput>(Type.Object({
  body: Type.Optional(Type.String()),
  headers: Type.Array(Type.Tuple([Type.String(), Type.String()])),
  method: Identifier,
  timeoutMs: Type.Number({ exclusiveMinimum: 0 }),
  url: Identifier,
}, { additionalProperties: false }))

const developerFetchAction = defineAction({
  audiences: CONNECTED_ONLY,
  name: "developer.fetch",
  kind: "command",
  description: "Fetch an HTTP(S) URL through the connected browser for Source development.",
  params: FetchParams,
  result: Type.Unsafe<ExtensionConnectionFetchResponse>(Type.Object({
    body: Type.String(),
    headers: Type.Array(Type.Tuple([Type.String(), Type.String()])),
    status: Type.Number(),
    statusText: Type.String(),
  }, { additionalProperties: false })),
  validate(input) {
    validateFetch(input)
  },
  diagnostics: {
    input: input => ({
      body: input.body === undefined ? undefined : "[redacted]",
      headerNames: input.headers.map(([headerName]) => headerName),
      method: input.method.toUpperCase(),
      timeoutMs: input.timeoutMs,
      url: input.url,
    }),
    output: output => ({
      body: "[redacted]",
      headerNames: output.headers.map(([headerName]) => headerName),
      status: output.status,
      statusText: output.statusText,
    }),
  },
}, async (input, context: BackgroundActionContext) => await context.developer.fetch({
  ...input,
  method: input.method.toUpperCase(),
}))
const AppLogEntryResult = Type.Object({
  id: Type.Number(),
  timestamp: Type.String(),
  level: stringEnum(["error", "warn", "info"] as const),
  target: Type.String(),
  message: Type.String(),
}, { additionalProperties: false })

const DeveloperRunSourceParams = Type.Unsafe<RunDeveloperSourceInput>(Type.Union([
  Type.Object({
    debug: Type.Boolean(),
    params: Type.Optional(RecordValue),
    sourceId: Identifier,
  }, { additionalProperties: false }),
  Type.Object({
    debug: Type.Boolean(),
    params: Type.Optional(RecordValue),
    provider: RecordValue,
    providerId: Identifier,
    sourceId: Identifier,
    useProviderSecrets: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
]))

const DeveloperRunSourceResult = Type.Unsafe<RunDeveloperSourceOutput>(Type.Object({
  data: Type.Array(Type.Unknown()),
  execution: Type.Object({
    durationMs: Type.Number(),
    loadedAt: Type.Number(),
    params: RecordValue,
    providerId: Type.String(),
    sourceId: Type.String(),
    sourceVersion: Type.Number(),
  }),
  fetches: Type.Optional(Type.Array(Type.Unknown())),
}, { additionalProperties: true }))

const developerRunSourceAction = defineAction({
  audiences: CONNECTED_ONLY,
  name: "developer.runSource",
  kind: "command",
  description: "Run a registered or supplied Source for development and debugging.",
  params: DeveloperRunSourceParams,
  result: DeveloperRunSourceResult,
  diagnostics: {
    input: input => ({
      debug: input.debug,
      params: input.params,
      providerId: input.providerId,
      sourceId: input.sourceId,
      useProviderSecrets: input.useProviderSecrets,
    }),
  },
}, async (input, context: BackgroundActionContext) => await context.developer.runSource(input))

const radarResolveSuggestionsAction = defineAction({
  audiences: UI_ONLY,
  name: "radar.resolveSuggestions",
  kind: "query",
  description: "Resolve Source suggestions for the current browser page.",
  params: Type.Object({
    tabId: Type.Number(),
    title: Type.Optional(Type.String()),
    url: Identifier,
  }, { additionalProperties: false }),
  result: Type.Unsafe<ResolvedRadarSuggestion[]>(Type.Array(Type.Unknown())),
}, async (input, context: BackgroundActionContext) => await context.radar.resolveSuggestions(input))

const sourceLoadAction = defineAction({
  audiences: UI_AND_CONNECTED,
  name: "source.load",
  kind: "command",
  description: "Load one configured Source through the background runtime.",
  params: Type.Object({
    params: Type.Optional(RecordValue),
    requestId: Type.Optional(Identifier),
    sourceId: Identifier,
  }, { additionalProperties: false }),
  result: SourceLoadResponseResult,
}, async (input, context: BackgroundActionContext) => await context.source.load(input))

const sourceCancelAction = defineAction({
  audiences: UI_ONLY,
  name: "source.cancel",
  kind: "command",
  description: "Cancel an active background Source load.",
  params: Type.Object({ requestId: Identifier }, { additionalProperties: false }),
  result: EmptyResult,
}, async (input, context: BackgroundActionContext) => {
  await context.source.cancel(input)
  return {}
})

const jobExecuteInstanceAction = defineAction({
  audiences: CONNECTED_ONLY,
  name: "job.executeInstance",
  kind: "command",
  description: "Execute one configured Instance for a CLI-owned background Job.",
  params: RoutedInstanceParams,
  result: SourceLoadResponseResult,
}, async (input, context: BackgroundActionContext) => (
  await context.job.executeInstance(input)
))

const loaderLoadInstanceAction = defineAction({
  audiences: CONNECTED_ONLY,
  name: "loader.loadInstance",
  kind: "query",
  description: "Load one routed Workspace Instance in its bound browser Loader.",
  params: RoutedInstanceParams,
  result: SourceLoadResponseResult,
}, async (input, context: BackgroundActionContext) => (
  await context.loader.loadInstance(input)
))

const loaderReadInstanceCacheAction = defineAction({
  audiences: CONNECTED_ONLY,
  name: "loader.readInstanceCache",
  kind: "query",
  description: "Read one routed Workspace Instance's persisted result without executing its Source.",
  params: RoutedInstanceParams,
  result: SourceCacheResult,
}, async (input, context: BackgroundActionContext) => (
  await context.loader.readInstanceCache(input)
))

const appIntegrationGetStatusAction = defineAction({
  audiences: UI_ONLY,
  name: "appIntegration.getStatus",
  kind: "query",
  description: "Get the local NewsNext App connection status.",
  params: EmptyParams,
  result: AppIntegrationStatusResult,
}, async (_input, context: BackgroundActionContext) => await context.appIntegration.getStatus())

const appIntegrationGetLogsAction = defineAction({
  audiences: UI_ONLY,
  name: "appIntegration.getLogs",
  kind: "query",
  description: "Get recent NewsNext App service logs.",
  params: EmptyParams,
  result: Type.Array(AppLogEntryResult),
}, async (_input, context: BackgroundActionContext) => await context.appIntegration.getLogs())

const appIntegrationLoadInstanceAction = defineAction({
  audiences: UI_ONLY,
  name: "appIntegration.loadInstance",
  kind: "query",
  description: "Load an Instance through the Workspace router.",
  params: Type.Object({ instanceId: Identifier }, { additionalProperties: false }),
  result: SourceLoadResponseResult,
}, async (input, context: BackgroundActionContext) => (
  await context.appIntegration.loadInstance(input)
))

const appIntegrationReadInstanceCacheAction = defineAction({
  audiences: UI_ONLY,
  name: "appIntegration.readInstanceCache",
  kind: "query",
  description: "Read an Instance's persisted result through the Workspace router.",
  params: Type.Object({ instanceId: Identifier }, { additionalProperties: false }),
  result: SourceCacheResult,
}, async (input, context: BackgroundActionContext) => (
  await context.appIntegration.readInstanceCache(input)
))

const appIntegrationSetEnabledAction = defineAction({
  audiences: UI_ONLY,
  name: "appIntegration.setEnabled",
  kind: "mutation",
  description: "Enable or disable the local NewsNext App connection on this device.",
  params: Type.Object({
    enabled: Type.Boolean(),
  }, { additionalProperties: false }),
  result: AppIntegrationStatusResult,
}, async (input, context: BackgroundActionContext) => await context.appIntegration.setEnabled(input))

const appIntegrationRegenerateWorkerAction = defineAction({
  audiences: UI_ONLY,
  name: "appIntegration.regenerateWorker",
  kind: "mutation",
  description: "Generate a new Worker identity and reconnect this browser.",
  params: EmptyParams,
  result: AppIntegrationStatusResult,
}, async (_input, context: BackgroundActionContext) => (
  await context.appIntegration.regenerateWorker()
))

const appIntegrationSetWorkerAction = defineAction({
  audiences: UI_ONLY,
  name: "appIntegration.setWorker",
  kind: "mutation",
  description: "Reconnect this browser as a persisted NewsNext Worker.",
  params: Type.Object({
    workerId: Identifier,
  }, { additionalProperties: false }),
  result: AppIntegrationStatusResult,
}, async (input, context: BackgroundActionContext) => await context.appIntegration.setWorker(input))

const illustrationStoreAction = defineAction({
  audiences: UI_ONLY,
  name: "illustration.store",
  kind: "mutation",
  description: "Store a background illustration and return its content ID.",
  params: Type.Object({
    illustration: Type.String({ maxLength: MAX_BG_ILLUSTRATION_DATA_URL_LENGTH }),
  }, { additionalProperties: false }),
  result: Type.Object({ id: Identifier }, { additionalProperties: false }),
}, async (input, context: BackgroundActionContext) => {
  const bytes = encodeBgIllustration(input.illustration)
  if (bytes === null) throw new Error("The background illustration is invalid")
  const id = await createBgIllustrationId(bytes)
  await context.appIntegration.putIllustration({ bytes, id })
  return { id }
})

const illustrationGetAction = defineAction({
  audiences: UI_ONLY,
  name: "illustration.get",
  kind: "query",
  description: "Read a Board background illustration from local or App storage.",
  params: Type.Object({ id: Identifier }, { additionalProperties: false }),
  result: Type.Union([
    Type.String({ maxLength: MAX_BG_ILLUSTRATION_DATA_URL_LENGTH }),
    Type.Null(),
  ]),
}, async (input, context: BackgroundActionContext) => {
  const bytes = await context.appIntegration.getIllustration(input)
  return bytes === null ? null : decodeBgIllustration(bytes)
})

const nextLayerGetWidgetSnapshotAction = defineAction({
  audiences: UI_ONLY,
  name: "nextLayer.getWidgetSnapshot",
  kind: "query",
  description: "Read one CLI-owned materialized Widget Snapshot.",
  params: Type.Object({
    boardId: Identifier,
    widgetId: Identifier,
  }, { additionalProperties: false }),
  result: Type.Unknown(),
}, async (input, context: BackgroundActionContext) => (
  await context.appIntegration.getWidgetSnapshot(input)
))

export const uiBackgroundActionDefinitions = [
  radarResolveSuggestionsAction,
  sourceLoadAction,
  sourceCancelAction,
  appIntegrationGetStatusAction,
  appIntegrationGetLogsAction,
  appIntegrationLoadInstanceAction,
  appIntegrationReadInstanceCacheAction,
  appIntegrationRegenerateWorkerAction,
  appIntegrationSetEnabledAction,
  appIntegrationSetWorkerAction,
  illustrationStoreAction,
  illustrationGetAction,
  nextLayerGetWidgetSnapshotAction,
] as const

export const backgroundActionDefinitions = [
  developerFetchAction,
  developerRunSourceAction,
  jobExecuteInstanceAction,
  loaderLoadInstanceAction,
  loaderReadInstanceCacheAction,
  ...uiBackgroundActionDefinitions,
] as const

function stringEnum<const Values extends readonly string[]>(values: Values) {
  return Type.Unsafe<Values[number]>({ type: "string", enum: values })
}

function validateFetch(input: ConnectedFetchInput): void {
  if (!isExtensionFetchUrl(input.url)) {
    throw new Error("Fetch URL must be HTTP(S) without embedded credentials")
  }
  const method = input.method.toUpperCase()
  if (!isExtensionFetchMethod(method)) throw new Error("Fetch method is invalid or unsupported")
  for (const [name, value] of input.headers) {
    if (!isHttpToken(name) || /[\r\n]/.test(value)) {
      throw new Error("'headers' contains an invalid HTTP header")
    }
    if (name.toLowerCase() === "cookie") {
      throw new Error("The Cookie header is browser-managed and cannot be overridden")
    }
  }
  if (input.body !== undefined && ["GET", "HEAD"].includes(method)) {
    throw new Error(`${method} requests cannot have a body`)
  }
}

function isExtensionFetchUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password
  } catch {
    return false
  }
}

function isExtensionFetchMethod(value: string): boolean {
  return isHttpToken(value) && !["CONNECT", "TRACE", "TRACK"].includes(value)
}

function isHttpToken(value: string): boolean {
  return /^[!#$%&'*+.^\w`|~-]+$/.test(value)
}
