import type { JSONRPCRequest } from "json-rpc-2.0"
import type { SourceLoadResponse } from "../../source/load-result"
import type { CollectionStatus } from "@/lib/native-protocol/CollectionStatus"
import type { CollectionStatusSubscribeParams } from "@/lib/native-protocol/CollectionStatusSubscribeParams"
import type { ExtensionCommand } from "@/lib/native-protocol/ExtensionCommand"
import type { LiveCardGetParams } from "@/lib/native-protocol/LiveCardGetParams"
import type { LogEntry } from "@/lib/native-protocol/LogEntry"
import type { SdkOpenParams } from "@/lib/native-protocol/SdkOpenParams"
import type { SdkStreamParams } from "@/lib/native-protocol/SdkStreamParams"
import type { WorkerTakeoverParams } from "@/lib/native-protocol/WorkerTakeoverParams"
import type { WorkspaceCommitParams } from "@/lib/native-protocol/WorkspaceCommitParams"
import type { WorkspaceCommitResult } from "@/lib/native-protocol/WorkspaceCommitResult"
import { JSONRPCClient, JSONRPCErrorException, JSONRPCServer } from "json-rpc-2.0"
import { createId } from "../../id"
import { parseExtensionCommand } from "../../native-messaging"
import { isSourceLoadResponse } from "../../source/load-result"
import { parseCollectionStatus } from "./collection-status"
import { parseLocalCardIds, parseLogs, parseRevision } from "./message-values"
import { isRpcNotification, isRpcRequest, parseRpcNotification, parseRpcRequest, parseRpcResponse } from "./rpc-message"

interface NativeMethods {
  "collectionStatusSubscribe": { params: CollectionStatusSubscribeParams, result: null }
  "sdk.open": { params: SdkOpenParams, result: null }
  "sdk.next": { params: SdkStreamParams, result: unknown }
  "sdk.cancel": { params: SdkStreamParams, result: null }
  "logsGet": { params: Record<string, never>, result: LogEntry[] }
  "collectionStatusGet": { params: Record<string, never>, result: CollectionStatus }
  "liveCardGet": { params: LiveCardGetParams, result: SourceLoadResponse | null }
  "workspaceCommit": { params: WorkspaceCommitParams, result: WorkspaceCommitResult }
  "workerTakeover": { params: WorkerTakeoverParams, result: null }
}

const parsers: { [Method in keyof NativeMethods]: (value: unknown) => NativeMethods[Method]["result"] } = {
  "collectionStatusSubscribe": parseEmptyResult,
  "sdk.open": parseEmptyResult,
  "sdk.next": value => value,
  "sdk.cancel": parseEmptyResult,
  "logsGet": parseLogs,
  "collectionStatusGet": parseCollectionStatus,
  "liveCardGet": (value) => {
    if (value === null || isSourceLoadResponse(value)) return value
    throw new Error("The NewsNext Worker returned an invalid Source result")
  },
  "workspaceCommit": (value) => {
    if (!value || typeof value !== "object" || !("revision" in value) || !("localCardIds" in value)) {
      throw new Error("The native host returned an invalid Workspace commit")
    }
    const revision = parseRevision(value.revision, "Workspace")
    if (revision === 0) throw new Error("The native host returned an invalid Workspace revision")
    return { revision, localCardIds: parseLocalCardIds(value.localCardIds) }
  },
  "workerTakeover": parseEmptyResult,
}

function parseEmptyResult(value: unknown): null {
  if (value !== null) throw new Error("The native host returned an invalid empty RPC result")
  return null
}

// No message reached the transport, so callers must not allocate remote cleanup.
export class NativeRequestNotSentError extends Error {}

export class NativeRpcClient {
  private readonly server = new JSONRPCServer({
    errorListener: (message, error) => {
      if (!(error instanceof JSONRPCErrorException)) console.error(message, error)
    },
  })

  private executing = 0
  private readonly client: JSONRPCClient
  private closed = false
  private outstanding = 0
  private cancelling = 0

  constructor(
    private readonly send: (message: unknown) => void,
    private readonly timeoutMs: number,
    execute?: (request: ExtensionCommand) => Promise<unknown>,
    private readonly notification?: (message: JSONRPCRequest) => void,
    private readonly fatal?: (message: string) => void,
  ) {
    if (execute) {
      this.server.addMethod("execute", async (params: unknown) => {
        let request: ExtensionCommand
        try {
          if (!params || typeof params !== "object" || !("request" in params)) throw new Error("Missing extension command")
          request = parseExtensionCommand(params.request)
        } catch (error) {
          throw new JSONRPCErrorException(error instanceof Error ? error.message : "Invalid extension command", -32602)
        }
        if (this.closed) throw new Error("NewsNext App disconnected")
        if (this.executing >= 64) throw new JSONRPCErrorException("Too many outstanding Worker calls", -32001)
        this.executing += 1
        try {
          return await execute(request) ?? null
        } finally {
          this.executing -= 1
        }
      })
    }
    this.client = new JSONRPCClient((message: unknown) => {
      if (this.closed) throw new Error("NewsNext App disconnected")
      send(message)
    }, createId)
  }

  close(message: string): void {
    this.closed = true
    this.client.rejectAllPendingRequests(message)
  }

  async receive(message: unknown): Promise<void> {
    if (this.closed) return
    if (isRpcNotification(message)) {
      this.notification?.(parseRpcNotification(message))
    } else if (isRpcRequest(message)) {
      const response = await this.server.receive(parseRpcRequest(message))
      if (!this.closed && response) this.send(response)
    } else {
      this.client.receive(parseRpcResponse(message))
    }
  }

  async request<Method extends keyof NativeMethods>(
    method: Method,
    params: NativeMethods[Method]["params"],
    timeoutMs = this.timeoutMs,
  ): Promise<NativeMethods[Method]["result"]> {
    if (this.closed) throw new NativeRequestNotSentError("NewsNext App disconnected")
    const cancelling = method === "sdk.cancel"
    // Cleanup has reserved capacity, but cannot accumulate without a bound.
    if (cancelling ? this.cancelling >= 64 : this.outstanding >= 64) {
      if (cancelling) this.failCleanup()
      throw new NativeRequestNotSentError("Too many outstanding native requests")
    }
    if (cancelling) this.cancelling += 1
    else this.outstanding += 1
    try {
      const value: unknown = await this.client.timeout(timeoutMs).request(method, params)
      if (this.closed) throw new Error("NewsNext App disconnected")
      return parsers[method](value)
    } catch (error) {
      // An unacknowledged cancellation may leave a child alive. Disconnecting
      // releases every Host-local session instead of silently leaking it.
      if (cancelling && !this.closed) this.failCleanup()
      throw error
    } finally {
      if (cancelling) this.cancelling -= 1
      else this.outstanding -= 1
    }
  }

  private failCleanup(): void {
    const message = "Native SDK cleanup failed; reconnecting"
    this.close(message)
    this.fatal?.(message)
  }
}
