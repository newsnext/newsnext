import type { ExtensionConnectionFetchResponse } from "@newsnext/extension-connection"
import type { ResolvedRadarSuggestion } from "../radar"
import type { PersistedDeviceState } from "../settings"
import type { SourceLoadResponse } from "../source/load-result"
import type { ApplicationActionContext } from "./application-actions"
import type {
  RunDeveloperSourceInput,
  RunDeveloperSourceOutput,
} from "./developer-source-runner"
import type { SourceConnectionStatus } from "./source-connection-native"
import Type from "typebox"
import { defineAction } from "../action"

export interface ConnectedFetchInput {
  body?: string
  headers: [string, string][]
  method: string
  timeoutMs: number
  url: string
}

export interface BackgroundActionContext extends ApplicationActionContext {
  app: {
    open: (input: { boardId: string } | { settings: true }) => Promise<Record<string, never>>
  }
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
  source: {
    cancel: (input: { requestId: string }) => Promise<void>
    load: (input: {
      params?: Record<string, unknown>
      requestId?: string
      sourceId: string
    }) => Promise<SourceLoadResponse>
  }
  sourceConnection: {
    getStatus: () => Promise<SourceConnectionStatus>
    setEnabled: (input: {
      enabled: boolean
      frontendState?: PersistedDeviceState
    }) => Promise<SourceConnectionStatus>
  }
}

const UI_ONLY = ["ui"] as const
const CONNECTED_ONLY = ["connected"] as const
const UI_AND_CONNECTED = ["ui", "connected"] as const
const EmptyParams = Type.Object({}, { additionalProperties: false })
const EmptyResult = Type.Object({}, { additionalProperties: false })
const Identifier = Type.String({ minLength: 1 })
const RecordValue = Type.Record(Type.String(), Type.Unknown())

const appOpenAction = defineAction({
  audiences: CONNECTED_ONLY,
  name: "app.open",
  kind: "command",
  description: "Open a Board or Settings in the connected NewsNext extension.",
  params: Type.Union([
    Type.Object({ boardId: Identifier }, { additionalProperties: false }),
    Type.Object({ settings: Type.Literal(true) }, { additionalProperties: false }),
  ]),
  result: EmptyResult,
}, async (input, context: BackgroundActionContext) => await context.app.open(input))

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
  result: Type.Unsafe<SourceLoadResponse>(Type.Object({
    fetchProtected: Type.Boolean(),
    fetchedAt: Type.Number(),
    loadedAt: Type.Number(),
    params: RecordValue,
    result: Type.Object({}, { additionalProperties: true }),
  }, { additionalProperties: false })),
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

const sourceConnectionGetStatusAction = defineAction({
  audiences: UI_ONLY,
  name: "sourceConnection.getStatus",
  kind: "query",
  description: "Get the local CLI connection status.",
  params: EmptyParams,
  result: Type.Unsafe<SourceConnectionStatus>(Type.Object({
    cliVersion: Type.Optional(Type.String()),
    state: stringEnum(["disabled", "connected", "connecting", "disconnected"] as const),
  }, { additionalProperties: false })),
}, async (_input, context: BackgroundActionContext) => await context.sourceConnection.getStatus())

const PersistedDeviceStateParams = Type.Unsafe<PersistedDeviceState>(Type.Object({
  currentBoardId: Type.String(),
  settingsTab: stringEnum(["appearance", "general", "cli", "shortcuts", "permissions", "data"] as const),
  sourceConnectionEnabled: Type.Boolean(),
  version: Type.Number(),
}, { additionalProperties: false }))

const sourceConnectionSetEnabledAction = defineAction({
  audiences: UI_ONLY,
  name: "sourceConnection.setEnabled",
  kind: "mutation",
  description: "Enable or disable local CLI access on this device.",
  params: Type.Object({
    enabled: Type.Boolean(),
    frontendState: Type.Optional(PersistedDeviceStateParams),
  }, { additionalProperties: false }),
  result: Type.Unsafe<SourceConnectionStatus>(Type.Object({
    cliVersion: Type.Optional(Type.String()),
    state: stringEnum(["disabled", "connected", "connecting", "disconnected"] as const),
  }, { additionalProperties: false })),
}, async (input, context: BackgroundActionContext) => await context.sourceConnection.setEnabled(input))

export const uiBackgroundActionDefinitions = [
  radarResolveSuggestionsAction,
  sourceLoadAction,
  sourceCancelAction,
  sourceConnectionGetStatusAction,
  sourceConnectionSetEnabledAction,
] as const

export const backgroundActionDefinitions = [
  appOpenAction,
  developerFetchAction,
  developerRunSourceAction,
  radarResolveSuggestionsAction,
  sourceLoadAction,
  sourceCancelAction,
  sourceConnectionGetStatusAction,
  sourceConnectionSetEnabledAction,
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
