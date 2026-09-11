import type { JSONRPCRequest } from "json-rpc-2.0"
import type { NativePort } from "./types"
import type { ExtensionCommand } from "@/lib/native-protocol/ExtensionCommand"
import type { ExtensionToHost } from "@/lib/native-protocol/ExtensionToHost"
import { NativeRpcClient } from "./rpc-client"
import { NATIVE_REQUEST_TIMEOUT_MS } from "./state"

const sessions = new WeakMap<NativePort, NativeRpcClient>()

export function openNativeRpc(port: NativePort, execute: (request: ExtensionCommand) => Promise<unknown>, notification: (message: JSONRPCRequest) => void, fatal: (message: string) => void): void {
  if (sessions.has(port)) throw new Error("Native RPC session already exists")
  sessions.set(port, new NativeRpcClient((message) => {
    port.postMessage({ type: "rpc", message } satisfies ExtensionToHost)
  }, NATIVE_REQUEST_TIMEOUT_MS, execute, notification, fatal))
}

export function closeNativeRpc(port: NativePort, message: string): void {
  sessions.get(port)?.close(message)
  sessions.delete(port)
}

export async function receiveNativeRpc(port: NativePort, message: unknown): Promise<void> {
  await sessions.get(port)?.receive(message)
}

export function nativeRpc(port: NativePort): NativeRpcClient {
  const client = sessions.get(port)
  if (!client) throw new Error("NewsNext App disconnected")
  return client
}
