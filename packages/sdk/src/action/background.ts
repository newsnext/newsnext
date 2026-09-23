import type { ConnectedFetchInput, FetchResponse, NativeIntegrationStatus, ResolvedRadarSuggestion, RunDeveloperSourceInput, RunDeveloperSourceOutput, SourceLoadResponse, WidgetCatalogEntry } from "../models/index.js"
import Type from "typebox"
import { defineActionContract } from "./definition.js"
import { EmptyObject, Identifier, RecordValue, stringEnum } from "./schema.js"

const SourceLoadResponseResult = Type.Unsafe<SourceLoadResponse>(Type.Object({
  fetchProtected: Type.Boolean(),
  fetchedAt: Type.Number(),
  loadedAt: Type.Number(),
  params: RecordValue,
  result: Type.Object({}, { additionalProperties: true }),
}, { additionalProperties: false }))

const SourceSnapshotResult = Type.Unsafe<SourceLoadResponse | null>(Type.Union([
  SourceLoadResponseResult,
  Type.Null(),
]))

const WorkspaceSummaryResult = Type.Object({
  boards: Type.Integer({ minimum: 0 }),
  liveCards: Type.Integer({ minimum: 0 }),
  liveWidgets: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false })

// Built-in `view` and `params` carry the Widget manifest schema; custom views use `url`.
const WidgetCatalogEntryResult = Type.Unsafe<WidgetCatalogEntry>(Type.Object({
  id: Identifier,
  title: Type.String(),
  color: Type.String(),
  width: Type.Integer({ minimum: 1 }),
  height: Type.Integer({ minimum: 1 }),
  minWidth: Type.Integer({ minimum: 1 }),
  minHeight: Type.Integer({ minimum: 1 }),
  url: Type.Optional(Type.String()),
  view: Type.Optional(Type.Unknown()),
  params: Type.Unknown(),
  dataRevision: Type.String(),
  dataFiles: Type.Array(Type.String()),
  viewRevision: Type.String(),
  hasData: Type.Boolean(),
  refreshIntervalMs: Type.Number(),
}, { additionalProperties: false }))

const NativeIntegrationStatusResult = Type.Unsafe<NativeIntegrationStatus>(Type.Object({
  workspaceConflict: Type.Optional(Type.Object({
    revision: Type.Integer({ minimum: 0 }),
    local: WorkspaceSummaryResult,
    shared: WorkspaceSummaryResult,
  }, { additionalProperties: false })),
  daemonVersion: Type.Optional(Type.String()),
  capabilities: Type.Array(Type.String()),
  offlineWorkers: Type.Array(Type.Object({
    id: Identifier,
    cardIds: Type.Array(Identifier, { minItems: 1, uniqueItems: true }),
  }, { additionalProperties: false })),
  connectionError: Type.Optional(Type.Object({
    code: Type.Optional(Type.String()),
    message: Type.String(),
  }, { additionalProperties: false })),
  state: stringEnum([
    "disabled",
    "connected",
    "connecting",
    "workspaceConflict",
    "daemonOutdated",
    "hostNotInstalled",
    "protocolIncompatible",
    "serviceNotRunning",
    "daemonStartFailed",
    "workerConflict",
  ] as const),
  workerId: Identifier,
  widgetServerOrigin: Type.Optional(Type.String()),
}, { additionalProperties: false }))

const FetchParams = Type.Unsafe<ConnectedFetchInput>(Type.Object({
  body: Type.Optional(Type.String()),
  headers: Type.Array(Type.Tuple([Type.String(), Type.String()])),
  method: Identifier,
  timeoutMs: Type.Number({ exclusiveMinimum: 0 }),
  url: Identifier,
  searchParams: Type.Optional(Type.Union([
    Type.Record(Type.String(), Type.Union([
      Type.String(),
      Type.Number(),
      Type.Boolean(),
    ])),
    Type.Array(Type.Tuple([Type.String(), Type.String()])),
  ])),
  json: Type.Optional(Type.Unknown()),
  retry: Type.Optional(Type.Integer({ minimum: 0, maximum: 10 })),
  throwHttpErrors: Type.Optional(Type.Boolean()),
  redirect: Type.Optional(stringEnum(["follow", "manual", "error"] as const)),
  credentials: Type.Optional(stringEnum(["include", "omit", "same-origin"] as const)),
}, { additionalProperties: false }))

const developerFetchAction = defineActionContract({
  name: "developer.fetch",
  kind: "command",
  description: "Fetch an HTTP(S) URL through the connected browser for Source development.",
  params: FetchParams,
  result: Type.Unsafe<FetchResponse>(Type.Object({
    body: Type.String(),
    headers: Type.Array(Type.Tuple([Type.String(), Type.String()])),
    status: Type.Number(),
    statusText: Type.String(),
    url: Type.String(),
  }, { additionalProperties: false })),
  validate(input) {
    validateFetch(input)
  },
})

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

const developerRunSourceAction = defineActionContract({
  name: "developer.runSource",
  kind: "command",
  description: "Run a registered or supplied Source for development and debugging.",
  params: DeveloperRunSourceParams,
  result: DeveloperRunSourceResult,
})

const radarResolveSuggestionsAction = defineActionContract({
  name: "radar.resolveSuggestions",
  kind: "query",
  description: "Resolve Source suggestions for the current browser page.",
  params: Type.Object({
    tabId: Type.Number(),
    title: Type.Optional(Type.String()),
    url: Identifier,
  }, { additionalProperties: false }),
  result: Type.Unsafe<ResolvedRadarSuggestion[]>(Type.Array(Type.Unknown())),
})

const sourceLoadAction = defineActionContract({
  name: "source.load",
  kind: "command",
  description: "Load one configured Source through the background runtime.",
  params: Type.Object({
    params: Type.Optional(RecordValue),
    requestId: Type.Optional(Identifier),
    sourceId: Identifier,
  }, { additionalProperties: false }),
  result: SourceLoadResponseResult,
})

const sourceCancelAction = defineActionContract({
  name: "source.cancel",
  kind: "command",
  description: "Cancel an active background Source load.",
  params: Type.Object({ requestId: Identifier }, { additionalProperties: false }),
  result: EmptyObject,
})

const nativeIntegrationGetStatusAction = defineActionContract({
  name: "nativeIntegration.getStatus",
  kind: "query",
  description: "Get the local NewsNext CLI connection status.",
  params: EmptyObject,
  result: NativeIntegrationStatusResult,
})

const nativeIntegrationGetWidgetsAction = defineActionContract({
  name: "nativeIntegration.getWidgets",
  kind: "query",
  description: "List the renderable Widget definitions the daemon last published, including their entry URLs.",
  params: EmptyObject,
  result: Type.Array(WidgetCatalogEntryResult),
})

const nativeIntegrationGetLogsAction = defineActionContract({
  name: "nativeIntegration.getLogs",
  kind: "query",
  description: "Get recent NewsNext CLI service logs.",
  params: EmptyObject,
  result: Type.Array(AppLogEntryResult),
})

const nativeIntegrationSetLogLevelAction = defineActionContract({
  name: "nativeIntegration.setLogLevel",
  kind: "mutation",
  description: "Set the NewsNext CLI service log level (off disables logging entirely).",
  params: Type.Object({
    level: stringEnum(["off", "error", "warn", "info"] as const),
  }, { additionalProperties: false }),
  result: EmptyObject,
})

const liveCardLoadAction = defineActionContract({
  name: "liveCard.load",
  kind: "query",
  description: "Load a LiveCard through the Workspace router.",
  params: Type.Object({ cardId: Identifier }, { additionalProperties: false }),
  result: SourceLoadResponseResult,
})

const liveCardReadSnapshotAction = defineActionContract({
  name: "liveCard.readSnapshot",
  kind: "query",
  description: "Read a LiveCard's Source snapshot through the Workspace router.",
  params: Type.Object({ cardId: Identifier }, { additionalProperties: false }),
  result: SourceSnapshotResult,
})

const nativeIntegrationSetEnabledAction = defineActionContract({
  name: "nativeIntegration.setEnabled",
  kind: "mutation",
  description: "Enable or disable the local NewsNext CLI connection on this device.",
  params: Type.Object({
    enabled: Type.Boolean(),
  }, { additionalProperties: false }),
  result: NativeIntegrationStatusResult,
})

const nativeIntegrationResolveWorkspaceAction = defineActionContract({
  name: "nativeIntegration.resolveWorkspace",
  kind: "mutation",
  description: "Resolve local and shared Workspace differences before synchronization. Overwrite replaces shared data, merge keeps shared conflicts, discard uses shared data.",
  params: Type.Object({
    resolution: stringEnum(["overwrite", "merge", "discard"] as const),
    expectedRevision: Type.Integer({ minimum: 0 }),
  }, { additionalProperties: false }),
  result: NativeIntegrationStatusResult,
})

const nativeIntegrationRestartAction = defineActionContract({
  name: "nativeIntegration.restart",
  kind: "mutation",
  description: "Restart the local NewsNext CLI service. The connection drops and reconnects automatically.",
  params: EmptyObject,
  result: EmptyObject,
})

const nativeIntegrationRegenerateIdentityAction = defineActionContract({
  name: "nativeIntegration.regenerateIdentity",
  kind: "mutation",
  description: "Generate a new Worker identity and reconnect this browser.",
  params: EmptyObject,
  result: NativeIntegrationStatusResult,
})

const nativeIntegrationTakeOverAction = defineActionContract({
  name: "nativeIntegration.takeOver",
  kind: "mutation",
  description: "Reassign selected LiveCards from an offline Worker to this Worker.",
  params: Type.Object({
    cardIds: Type.Array(Identifier, { minItems: 1, uniqueItems: true }),
    workerId: Identifier,
  }, { additionalProperties: false }),
  result: NativeIntegrationStatusResult,
})

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
  if (input.json !== undefined && ["GET", "HEAD"].includes(method)) {
    throw new Error(`${method} requests cannot have a JSON body`)
  }
  if (input.body !== undefined && input.json !== undefined) {
    throw new Error("'body' and 'json' are mutually exclusive")
  }
  if (input.searchParams !== undefined) {
    const entries = Array.isArray(input.searchParams) ? input.searchParams : Object.entries(input.searchParams)
    for (const [name, value] of entries) {
      if (typeof name !== "string" || name.length === 0) {
        throw new Error("'searchParams' contains an invalid parameter name")
      }
      if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
        throw new TypeError("'searchParams' contains an invalid parameter value")
      }
    }
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

export const backgroundActionContracts = [
  developerFetchAction,
  developerRunSourceAction,
  radarResolveSuggestionsAction,
  sourceLoadAction,
  sourceCancelAction,
  nativeIntegrationGetStatusAction,
  nativeIntegrationGetWidgetsAction,
  nativeIntegrationGetLogsAction,
  nativeIntegrationSetLogLevelAction,
  liveCardLoadAction,
  liveCardReadSnapshotAction,
  nativeIntegrationSetEnabledAction,
  nativeIntegrationResolveWorkspaceAction,
  nativeIntegrationRestartAction,
  nativeIntegrationRegenerateIdentityAction,
  nativeIntegrationTakeOverAction,
] as const
