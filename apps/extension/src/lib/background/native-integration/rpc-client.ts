import type { ExtensionCommand, NativeMethods as SharedNativeMethods } from "@newsnext/sdk/native-protocol"
import type { JSONRPCRequest } from "json-rpc-2.0"
import type { SourceLoadResponse } from "../../source/load-result"
import { nativeMethods, parseNativeValue } from "@newsnext/sdk/native-protocol"
import { JSONRPCClient, JSONRPCErrorException, JSONRPCServer } from "json-rpc-2.0"
import { createId } from "../../id"
import { parseExtensionCommand } from "../../native-messaging"
import { isSourceLoadResponse } from "../../source/load-result"
import { isRpcNotification, isRpcRequest, parseRpcNotification, parseRpcRequest, parseRpcResponse } from "./rpc-message"

type NativeMethods = Omit<SharedNativeMethods, "liveCardSnapshotGet"> & {
  liveCardSnapshotGet: { params: SharedNativeMethods["liveCardSnapshotGet"]["params"], result: SourceLoadResponse | null }
}

function parseResult<Method extends keyof NativeMethods>(method: Method, value: unknown): NativeMethods[Method]["result"] {
  const result = parseNativeValue(nativeMethods[method].result, value)
  if (method === "liveCardSnapshotGet" && result !== null && !isSourceLoadResponse(result)) {
    throw new Error("The NewsNext Worker returned an invalid Source result")
  }
  // The method selects its corresponding schema; Source payloads add domain validation above.
  return result as NativeMethods[Method]["result"]
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
        if (this.closed) throw new Error("NewsNext CLI disconnected")
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
      if (this.closed) throw new Error("NewsNext CLI disconnected")
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
    if (this.closed) throw new NativeRequestNotSentError("NewsNext CLI disconnected")
    try {
      parseNativeValue(nativeMethods[method].params, params)
    } catch (error) {
      throw new NativeRequestNotSentError(error instanceof Error ? error.message : "Invalid native request")
    }
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
      if (this.closed) throw new Error("NewsNext CLI disconnected")
      return parseResult(method, value)
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
