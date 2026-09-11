import type { JSONRPCRequest, JSONRPCResponse } from "json-rpc-2.0"

export function parseRpcResponse(value: unknown): JSONRPCResponse {
  if (!isRecord(value)
    || value.jsonrpc !== "2.0"
    || typeof value.id !== "string"
    || !value.id
    || "method" in value
    || ("result" in value) === ("error" in value)) {
    throw new Error("The native host returned an invalid RPC response")
  }
  if ("result" in value) return { jsonrpc: "2.0", id: value.id, result: value.result }
  const error = value.error
  if (!isRecord(error) || !Number.isSafeInteger(error.code) || typeof error.message !== "string") {
    throw new Error("The native host returned an invalid RPC error")
  }
  return {
    jsonrpc: "2.0",
    id: value.id,
    error: { code: Number(error.code), message: error.message, data: error.data },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

export function parseRpcRequest(value: unknown): JSONRPCRequest {
  if (!isRecord(value)
    || value.jsonrpc !== "2.0"
    || !((typeof value.id === "string" && value.id.length > 0) || (typeof value.id === "number" && Number.isSafeInteger(value.id) && value.id >= 0))
    || typeof value.method !== "string"
    || !value.method
    || "result" in value
    || "error" in value
    || (value.params !== undefined && !isRecord(value.params) && !Array.isArray(value.params))) {
    throw new Error("The native host returned an invalid RPC request")
  }
  return { jsonrpc: "2.0", id: value.id, method: value.method, params: value.params }
}

export function isRpcRequest(value: unknown): boolean {
  return isRecord(value) && "method" in value
}

export function isRpcNotification(value: unknown): boolean {
  return isRecord(value) && "method" in value && !("id" in value)
}

export function parseRpcNotification(value: unknown): JSONRPCRequest {
  if (!isRecord(value) || "id" in value) throw new Error("The native host returned an invalid RPC notification")
  const request = parseRpcRequest({ ...value, id: 0 })
  return { jsonrpc: "2.0", method: request.method, params: request.params }
}
