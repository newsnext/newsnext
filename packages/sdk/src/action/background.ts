import type { ConnectedFetchInput, FetchResponse, LiveCard, NativeIntegrationStatus, ResolvedRadarSuggestion, RunDeveloperSourceInput, RunDeveloperSourceOutput, SourceLoadResponse } from "../models/index.js"
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

const SourceCacheResult = Type.Unsafe<SourceLoadResponse | null>(Type.Union([
  SourceLoadResponseResult,
  Type.Null(),
]))

const NativeIntegrationStatusResult = Type.Unsafe<NativeIntegrationStatus>(Type.Object({
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

const LiveCardParams = Type.Unsafe<LiveCard>(Type.Object({
  createdAt: Type.Number(),
  cardId: Identifier,
  workerId: Identifier,
  patch: Type.Object({}, { additionalProperties: true }),
  sourceId: Identifier,
}, { additionalProperties: false }))

const RoutedLiveCardParams = Type.Object({ card: LiveCardParams }, { additionalProperties: false })

const FetchParams = Type.Unsafe<ConnectedFetchInput>(Type.Object({
  body: Type.Optional(Type.String()),
  headers: Type.Array(Type.Tuple([Type.String(), Type.String()])),
  method: Identifier,
  timeoutMs: Type.Number({ exclusiveMinimum: 0 }),
  url: Identifier,
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

const loaderLoadLiveCardAction = defineActionContract({
  name: "loader.loadLiveCard",
  kind: "query",
  description: "Load one routed Workspace LiveCard in its bound browser Loader.",
  params: RoutedLiveCardParams,
  result: SourceLoadResponseResult,
})

const loaderReadLiveCardCacheAction = defineActionContract({
  name: "loader.readLiveCardCache",
  kind: "query",
  description: "Read one routed Workspace LiveCard's persisted result without executing its Source.",
  params: RoutedLiveCardParams,
  result: SourceCacheResult,
})

const nativeIntegrationGetStatusAction = defineActionContract({
  name: "nativeIntegration.getStatus",
  kind: "query",
  description: "Get the local NewsNext App connection status.",
  params: EmptyObject,
  result: NativeIntegrationStatusResult,
})

const nativeIntegrationGetLogsAction = defineActionContract({
  name: "nativeIntegration.getLogs",
  kind: "query",
  description: "Get recent NewsNext App service logs.",
  params: EmptyObject,
  result: Type.Array(AppLogEntryResult),
})

const liveCardLoadAction = defineActionContract({
  name: "liveCard.load",
  kind: "query",
  description: "Load a LiveCard through the Workspace router.",
  params: Type.Object({ cardId: Identifier }, { additionalProperties: false }),
  result: SourceLoadResponseResult,
})

const liveCardReadCacheAction = defineActionContract({
  name: "liveCard.readCache",
  kind: "query",
  description: "Read a LiveCard's persisted result through the Workspace router.",
  params: Type.Object({ cardId: Identifier }, { additionalProperties: false }),
  result: SourceCacheResult,
})

const nativeIntegrationSetEnabledAction = defineActionContract({
  name: "nativeIntegration.setEnabled",
  kind: "mutation",
  description: "Enable or disable the local NewsNext App connection on this device.",
  params: Type.Object({
    enabled: Type.Boolean(),
  }, { additionalProperties: false }),
  result: NativeIntegrationStatusResult,
})

const workerRegenerateIdentityAction = defineActionContract({
  name: "worker.regenerateIdentity",
  kind: "mutation",
  description: "Generate a new Worker identity and reconnect this browser.",
  params: EmptyObject,
  result: NativeIntegrationStatusResult,
})

const workerTakeOverAction = defineActionContract({
  name: "worker.takeOver",
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
  loaderLoadLiveCardAction,
  loaderReadLiveCardCacheAction,
  nativeIntegrationGetStatusAction,
  nativeIntegrationGetLogsAction,
  liveCardLoadAction,
  liveCardReadCacheAction,
  nativeIntegrationSetEnabledAction,
  workerRegenerateIdentityAction,
  workerTakeOverAction,
] as const
