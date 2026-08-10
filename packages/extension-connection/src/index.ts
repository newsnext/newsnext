import type {
  ExtensionConnectionCommandRequest,
  ExtensionConnectionCommandResult,
  ExtensionConnectionInstance,
  ExtensionConnectionSerializedError,
} from "./types"
import { initTRPC, TRPCError } from "@trpc/server"

export const DAEMON_TRPC_PATH = "/__newsnext/trpc"

export interface DaemonStatus {
  pid: number
  startedAt: number
  url: string
  instances: ExtensionConnectionInstance[]
}

export interface DaemonExecuteInput {
  request: ExtensionConnectionCommandRequest
  browser?: string
  timeoutMs: number
}

export type DaemonExecuteResponse
  = | {
    ok: true
    data?: unknown
    instance: ExtensionConnectionInstance
  }
  | {
    ok: false
    kind: "extension"
    error: ExtensionConnectionSerializedError
  }
  | {
    ok: false
    kind: "daemon"
    error: {
      message: string
    }
  }

interface DaemonControlContext {
  role: "control"
  execute: (input: DaemonExecuteInput) => Promise<DaemonExecuteResponse>
  getStatus: () => DaemonStatus
  stop: () => void
}

interface ExtensionConnectionContext {
  role: "extension"
  complete: (result: ExtensionConnectionCommandResult) => void
  info: DaemonInfo
  subscribe: (signal?: AbortSignal) => AsyncIterable<ExtensionConnectionCommandRequest>
}

export interface DaemonInfo {
  version: string
}

export type DaemonRouterContext = DaemonControlContext | ExtensionConnectionContext

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isOptionalFiniteNumber(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === "number" && Number.isFinite(value))
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string"
}

export function parseExtensionConnectionCommandRequest(
  value: unknown,
): ExtensionConnectionCommandRequest {
  if (!isRecord(value) || typeof value.id !== "string") {
    throw new Error("Invalid extension command")
  }
  if (value.type === "source.list") {
    return {
      id: value.id,
      type: "source.list",
    }
  }
  if (
    value.type === "source.run"
    && typeof value.sourceId === "string"
    && (value.params === undefined || isRecord(value.params))
  ) {
    if (value.providerId === undefined && value.provider === undefined) {
      return {
        id: value.id,
        type: "source.run",
        sourceId: value.sourceId,
        params: value.params,
      }
    }
    if (typeof value.providerId === "string" && isRecord(value.provider)) {
      return {
        id: value.id,
        type: "source.run",
        providerId: value.providerId,
        sourceId: value.sourceId,
        provider: value.provider,
        params: value.params,
        useProviderSecrets: value.useProviderSecrets === true,
      }
    }
  }
  if (
    value.type === "source-history.datasets"
    && isOptionalString(value.cursor)
    && isOptionalFiniteNumber(value.limit)
    && isOptionalString(value.providerId)
    && isOptionalString(value.sourceId)
  ) {
    return {
      id: value.id,
      type: "source-history.datasets",
      cursor: value.cursor,
      limit: value.limit,
      providerId: value.providerId,
      sourceId: value.sourceId,
    }
  }
  if (
    value.type === "source-history.observations"
    && typeof value.sourceId === "string"
    && (value.params === undefined || isRecord(value.params))
    && isOptionalFiniteNumber(value.cursor)
    && isOptionalFiniteNumber(value.from)
    && isOptionalFiniteNumber(value.limit)
    && isOptionalFiniteNumber(value.to)
  ) {
    return {
      id: value.id,
      type: "source-history.observations",
      sourceId: value.sourceId,
      params: value.params,
      cursor: value.cursor,
      from: value.from,
      limit: value.limit,
      to: value.to,
    }
  }
  if (
    value.type === "source-history.get"
    && typeof value.sourceId === "string"
    && (value.params === undefined || isRecord(value.params))
    && typeof value.observedAt === "number"
    && Number.isFinite(value.observedAt)
  ) {
    return {
      id: value.id,
      type: "source-history.get",
      sourceId: value.sourceId,
      params: value.params,
      observedAt: value.observedAt,
    }
  }
  if (
    value.type === "source-history.compare"
    && typeof value.sourceId === "string"
    && (value.params === undefined || isRecord(value.params))
    && typeof value.before === "number"
    && Number.isFinite(value.before)
    && typeof value.after === "number"
    && Number.isFinite(value.after)
  ) {
    return {
      id: value.id,
      type: "source-history.compare",
      sourceId: value.sourceId,
      params: value.params,
      before: value.before,
      after: value.after,
    }
  }
  throw new Error("Invalid extension command")
}

export function parseDaemonExecuteInput(value: unknown): DaemonExecuteInput {
  if (
    !isRecord(value)
    || (typeof value.browser !== "string" && value.browser !== undefined)
    || typeof value.timeoutMs !== "number"
    || !Number.isFinite(value.timeoutMs)
    || value.timeoutMs <= 0
  ) {
    throw new Error("Invalid execution request")
  }
  return {
    request: parseExtensionConnectionCommandRequest(value.request),
    browser: value.browser,
    timeoutMs: value.timeoutMs,
  }
}

export function parseExtensionConnectionInstance(value: unknown): ExtensionConnectionInstance {
  if (
    !isRecord(value)
    || typeof value.id !== "string"
    || typeof value.browser !== "string"
    || typeof value.extensionVersion !== "string"
  ) {
    throw new Error("Invalid extension connection metadata")
  }
  return {
    id: value.id,
    browser: value.browser,
    extensionVersion: value.extensionVersion,
  }
}

export function parseExtensionConnectionCommandResult(value: unknown): ExtensionConnectionCommandResult {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.ok !== "boolean") {
    throw new Error("Invalid extension command result")
  }
  if (value.ok) {
    return {
      id: value.id,
      ok: true,
      data: value.data,
    }
  }
  if (
    !isRecord(value.error)
    || typeof value.error.name !== "string"
    || typeof value.error.message !== "string"
  ) {
    throw new Error("Invalid extension command result")
  }
  return {
    id: value.id,
    ok: false,
    error: {
      name: value.error.name,
      message: value.error.message,
      stack: typeof value.error.stack === "string" ? value.error.stack : undefined,
      code: typeof value.error.code === "string" ? value.error.code : undefined,
      loginUrl: typeof value.error.loginUrl === "string" ? value.error.loginUrl : undefined,
    },
  }
}

export function getDaemonEndpoint(wsUrl: URL): URL {
  const url = new URL(wsUrl)
  url.protocol = "http:"
  url.pathname = DAEMON_TRPC_PATH
  url.search = ""
  url.hash = ""
  return url
}

const t = initTRPC.context<DaemonRouterContext>().create()

const controlProcedure = t.procedure.use(({ ctx, next }) => {
  if (ctx.role !== "control") {
    throw new TRPCError({ code: "FORBIDDEN" })
  }
  return next({ ctx })
})

const extensionProcedure = t.procedure.use(({ ctx, next }) => {
  if (ctx.role !== "extension") {
    throw new TRPCError({ code: "FORBIDDEN" })
  }
  return next({ ctx })
})

export const daemonRouter = t.router({
  execute: controlProcedure
    .input(parseDaemonExecuteInput)
    .mutation(({ ctx, input }) => ctx.execute(input)),
  extension: t.router({
    info: extensionProcedure.query(({ ctx }) => ctx.info),
    commands: extensionProcedure.subscription(({ ctx, signal }) => ctx.subscribe(signal)),
    complete: extensionProcedure
      .input(parseExtensionConnectionCommandResult)
      .mutation(({ ctx, input }) => ctx.complete(input)),
  }),
  status: controlProcedure.query(({ ctx }) => ctx.getStatus()),
  stop: controlProcedure.mutation(({ ctx }) => {
    setTimeout(ctx.stop, 50)
    return { ok: true }
  }),
})

export type DaemonRouter = typeof daemonRouter

export type {
  ExtensionConnectionCommandRequest,
  ExtensionConnectionCommandResult,
  ExtensionConnectionInstance,
  ExtensionConnectionListRequest,
  ExtensionConnectionProviderRunRequest,
  ExtensionConnectionRegisteredRunRequest,
  ExtensionConnectionRunRequest,
  ExtensionConnectionSerializedError,
  SourceHistoryCommandRequest,
  SourceHistoryCompareObservationsRequest,
  SourceHistoryGetObservationRequest,
  SourceHistoryListDatasetsRequest,
  SourceHistoryListObservationsRequest,
} from "./types"
