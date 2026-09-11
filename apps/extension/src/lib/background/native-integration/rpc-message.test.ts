import { describe, expect, it } from "vitest"
import { parseRpcNotification, parseRpcRequest, parseRpcResponse } from "./rpc-message"

describe("parseRpcResponse", () => {
  it("accepts null cache results and preserves structured application errors", () => {
    expect(parseRpcResponse({ jsonrpc: "2.0", id: "cache", result: null })).toEqual({ jsonrpc: "2.0", id: "cache", result: null })
    const response = {
      jsonrpc: "2.0",
      id: "commit",
      error: { code: -32000, message: "revision conflict", data: { code: "WORKSPACE_CONFLICT" } },
    }
    expect(parseRpcResponse(response)).toEqual(response)
  })

  it("rejects ambiguous envelopes, wrong versions, invalid identifiers and malformed errors", () => {
    for (const value of [
      null,
      [],
      { jsonrpc: "1.0", id: "a", result: {} },
      { jsonrpc: "2.0", id: null, result: {} },
      { jsonrpc: "2.0", id: "", result: {} },
      { jsonrpc: "2.0", id: "a" },
      { jsonrpc: "2.0", id: "a", result: null, error: {} },
      { jsonrpc: "2.0", id: "a", result: null, method: "logsGet" },
      { jsonrpc: "2.0", id: "a", error: { code: 1.5, message: "failure" } },
      { jsonrpc: "2.0", id: "a", error: { code: -32000, message: null } },
    ]) expect(() => parseRpcResponse(value)).toThrow(/invalid RPC/)
  })
})

describe("parseRpcRequest", () => {
  it("accepts reverse call IDs and rejects notifications and response envelopes", () => {
    const request = { jsonrpc: "2.0", id: 0, method: "execute", params: { request: { type: "action.list", id: "execution-id" } } }
    expect(parseRpcRequest(request)).toEqual(request)
    for (const value of [
      { ...request, id: null },
      { ...request, id: undefined },
      { ...request, id: 0.5 },
      { ...request, jsonrpc: "1.0" },
      { ...request, result: null },
      { ...request, params: "invalid" },
    ]) expect(() => parseRpcRequest(value)).toThrow(/invalid RPC request/)
  })
})

describe("parseRpcNotification", () => {
  it("accepts notifications without inventing IDs and rejects calls and ambiguous payloads", () => {
    const notification = { jsonrpc: "2.0", method: "workspaceChanged", params: {} }
    expect(parseRpcNotification(notification)).toEqual(notification)
    for (const value of [
      { ...notification, id: null },
      { ...notification, id: "call" },
      { ...notification, id: undefined },
      { ...notification, jsonrpc: "1.0" },
      { ...notification, result: {} },
      { ...notification, error: {} },
      { ...notification, params: 1 },
    ]) expect(() => parseRpcNotification(value)).toThrow()
  })
})
