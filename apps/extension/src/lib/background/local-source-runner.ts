import type { NativeMethods } from "@newsnext/sdk/native-protocol"
import type { SourceResponseTransport } from "@newsnext/source-kit/local"
import type { ProviderConfig } from "@newsnext/source-kit/registry"
import type { NewsItem, SourceLoader, SourceLoaderContext, SourceLoaderOutput, SourceLoaderResult } from "@newsnext/source-kit/types"
import { SourceLoginRequiredError } from "@newsnext/source-kit/core"
import { bindLocalProvider, decodeSourceResponse, encodeSourceResponse } from "@newsnext/source-kit/local"
import { createId } from "../id"
import { nativeRpc } from "./native-integration/rpc"
import { runtime } from "./native-integration/state"

type FunctionCall = NativeMethods["localSourceCall"]["params"]["call"]
interface LocalExecution {
  context: SourceLoaderContext
  execute: () => Promise<SourceLoaderResult>
  started: boolean
  outcome?: { result: SourceLoaderResult } | { error: unknown }
  call: (call: FunctionCall) => Promise<unknown>
}
const executions = new Map<string, LocalExecution>()
const executionSignals = new WeakMap<AbortSignal, LocalExecution>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function unwrapResult<T>(value: unknown): T {
  if (!isRecord(value)) throw new Error("Invalid local Source reply")
  if (isRecord(value.error)) {
    if (value.error.code === "SOURCE_LOGIN_REQUIRED" && typeof value.error.loginUrl === "string") {
      throw new SourceLoginRequiredError(value.error.loginUrl)
    }
    throw Object.assign(new Error(String(value.error.message)), { name: value.error.name, code: value.error.code })
  }
  if (!("result" in value)) throw new Error("Missing local Source result")
  return value.result as T
}

function executionFor(signal?: AbortSignal): LocalExecution {
  const execution = signal && executionSignals.get(signal)
  if (!execution) throw new Error("Local Source execution expired")
  execution.context.signal.throwIfAborted()
  return execution
}

/** Only the callback slots cross the host boundary; all Source compilation stays here. */
export function bindLocalSourceProvider(value: unknown): { provider: ProviderConfig, requiresSession: (sourceKey: string) => boolean } {
  const sources = new Set<string>()
  let defaultFunctions = false
  const provider = bindLocalProvider(value, (reference, source) => {
    if (source === undefined) defaultFunctions = true
    else sources.add(source)
    const functionId = reference.$sourceFunction
    if (reference.kind === "load") {
      return async (_params: unknown, context: SourceLoaderContext): Promise<SourceLoaderOutput> =>
        await executionFor(context.signal).call({ type: "load", functionId }) as SourceLoaderOutput
    }
    if (reference.kind === "request") {
      return async ({ url, signal }: { url: string, signal?: AbortSignal }): Promise<Response> =>
        decodeSourceResponse(await executionFor(signal).call({ type: "request", functionId, url }) as SourceResponseTransport)
    }
    const formatItems = async (items: readonly NewsItem[], context?: SourceLoaderContext): Promise<string[]> => {
      return await executionFor(context?.signal).call({ type: "annotation", functionId, items: items.map(item => ({ ...item })) }) as string[]
    }
    return Object.assign(async (item: NewsItem, context?: SourceLoaderContext) => (await formatItems([item], context))[0]!, { formatItems })
  })
  return { provider, requiresSession: sourceKey => defaultFunctions || sources.has(sourceKey) }
}

/** Keep one local module session alive while the extension runs its usual loader pipeline. */
export function createLocalSourceLoader(sourceId: string, revision: string, loader: SourceLoader): SourceLoader {
  return async (params, context) => {
    context.signal.throwIfAborted()
    const port = runtime.port
    if (!port || !runtime.ready) throw new Error("NewsNext CLI disconnected")
    const executionId = createId()
    const controller = new AbortController()
    const bound = { ...context, signal: controller.signal }
    const execution: LocalExecution = {
      context: bound,
      execute: () => loader(params, bound),
      started: false,
      call: async (call) => {
        bound.signal.throwIfAborted()
        return unwrapResult(await nativeRpc(port).request("localSourceCall", { executionId, call }))
      },
    }
    executions.set(executionId, execution)
    executionSignals.set(bound.signal, execution)
    let onAbort: () => void = () => {}
    let loadSettled = false
    try {
      const aborted = new Promise<never>((_, reject) => {
        onAbort = () => {
          controller.abort(context.signal.reason)
          reject(context.signal.reason)
        }
        context.signal.addEventListener("abort", onAbort, { once: true })
      })
      await Promise.race([
        nativeRpc(port).request("localSourceLoad", { sourceId, revision, executionId, params, secrets: context.secrets ?? {} }).finally(() => {
          loadSettled = true
        }),
        aborted,
      ])
      if (!execution.outcome) throw new Error("Local Source pipeline did not complete")
      if ("error" in execution.outcome) throw execution.outcome.error
      return execution.outcome.result
    } finally {
      context.signal.removeEventListener("abort", onAbort)
      executions.delete(executionId)
      executionSignals.delete(bound.signal)
      controller.abort()
      if (!loadSettled) await nativeRpc(port).request("localSourceCancel", { executionId })
    }
  }
}

/** Only active, browser-created execution tokens can use the bound Source context. */
export async function executeLocalSourceContext(executionId: string, operation: unknown): Promise<unknown> {
  const execution = executions.get(executionId)
  if (!execution) throw new Error("Local Source execution expired")
  const { context } = execution
  context.signal.throwIfAborted()
  if (!isRecord(operation)) throw new Error("Invalid local Source operation")
  if (operation.type === "execute") {
    if (execution.started) throw new Error("Local Source pipeline already started")
    execution.started = true
    try {
      execution.outcome = { result: await execution.execute() }
    } catch (error) {
      execution.outcome = { error }
    }
    // Acknowledge session completion; normalized content never makes a round trip through the host.
    return null
  }
  if (operation.type === "updateSecrets") {
    if (!isRecord(operation.secrets) || !Object.values(operation.secrets).every(value => typeof value === "string")) {
      throw new Error("Invalid local Source secrets")
    }
    await context.updateSecrets?.(operation.secrets as Record<string, string>)
    return null
  }
  if (operation.type !== "fetch" || typeof operation.url !== "string" || typeof operation.method !== "string"
    || !Array.isArray(operation.headers) || !operation.headers.every(header => Array.isArray(header) && header.length === 2 && header.every(item => typeof item === "string"))
    || (operation.body !== undefined && typeof operation.body !== "string")
    || !["include", "omit", "same-origin"].includes(String(operation.credentials))
    || !["follow", "error", "manual"].includes(String(operation.redirect))) {
    throw new Error("Invalid local Source fetch")
  }
  const body = typeof operation.body === "string"
    ? Uint8Array.from(atob(operation.body), character => character.charCodeAt(0))
    : undefined
  const response = await context.fetch(operation.url, {
    signal: context.signal,
    method: operation.method,
    headers: operation.headers as [string, string][],
    body,
    credentials: operation.credentials as RequestCredentials,
    redirect: operation.redirect as RequestRedirect,
    // Local ky hooks still run next to author code; that client owns its retry/timeout policy.
    retry: 0,
    timeout: false,
    throwHttpErrors: false,
  })
  return encodeSourceResponse(response)
}
