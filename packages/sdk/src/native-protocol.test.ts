import { describe, expect, it } from "vitest"
import {
  extensionCommandSchema,
  nativeHelloSchema,
  nativeMethods,
  nativeNotificationSchema,
  parseHostMessage,
  parseNativeValue,
  PROTOCOL_VERSION,
  workspacePatchSchema,
} from "./native-protocol"

const card = { createdAt: 1, cardId: "card", workerId: "worker", patch: {}, provider: null, sourceId: "rss:feed" }
const board = { color: "slate", createdAt: 1, layer: "now", id: "board", name: "News", nowLayer: { liveCards: ["card"] }, nextLayer: { liveWidgets: [] } }
const workspace = { revision: 0, updatedAt: 1, boardOrder: ["board"], boards: { board }, liveCards: { card }, liveWidgets: {}, settings: "{}" }
const hello = { type: "hello", protocolVersion: PROTOCOL_VERSION, worker: { id: "worker", browser: "chrome", extensionVersion: "1.0" }, workspace }

describe("native wire validation", () => {
  it("validates nested Workspace entities before either endpoint consumes them", () => {
    expect(parseNativeValue(nativeHelloSchema, hello)).toEqual(hello)
    for (const invalidCard of [{ ...card, createdAt: -1 }, { ...card, patch: [] }, { ...card, workerId: "" }, { ...card, sourceId: 42 }]) {
      expect(() => parseNativeValue(nativeHelloSchema, { ...hello, workspace: { ...workspace, liveCards: { card: invalidCard } } })).toThrow()
    }
    expect(() => parseNativeValue(nativeHelloSchema, { ...hello, workspace: { ...workspace, boardOrder: ["board", "board"] } })).toThrow()
    expect(() => parseNativeValue(nativeHelloSchema, { ...hello, worker: { ...hello.worker, extensionVersion: null } })).toThrow()
  })

  it("validates partial Workspace updates without requiring unchanged entities", () => {
    const patch = { expectedRevision: 0, updatedAt: 2, boardOrder: ["board"], boards: {}, liveCards: {}, liveWidgets: {}, settings: "{}" }
    expect(parseNativeValue(workspacePatchSchema, patch)).toEqual(patch)
    expect(() => parseNativeValue(workspacePatchSchema, { ...patch, boards: { board: { ...board, nowLayer: { liveCards: [42] } } } })).toThrow()
    expect(() => parseNativeValue(workspacePatchSchema, { ...patch, expectedRevision: Number.MAX_SAFE_INTEGER + 1 })).toThrow()
  })

  it("rejects malformed RPC payloads and results without coercion", () => {
    expect(() => parseNativeValue(nativeMethods.logsSetLevel.params, { level: "debug" })).toThrow()
    expect(() => parseNativeValue(nativeMethods["sdk.open"].params, { streamId: "stream", request: [] })).toThrow()
    expect(() => parseNativeValue(nativeMethods.collectionStatusSubscribe.params, { enabled: "true" })).toThrow()
    expect(() => parseNativeValue(nativeMethods.workspaceCommit.result, { revision: 0, localCardIds: [] })).toThrow()
    expect(() => parseNativeValue(nativeMethods.workerTakeover.result, {})).toThrow()
    expect(() => parseNativeValue(extensionCommandSchema, { type: "action.execute", id: "cmd", name: "board.list", input: null })).toThrow()
  })

  it("rejects incomplete notifications and unknown notification methods", () => {
    expect(() => parseNativeValue(nativeNotificationSchema, { method: "localSourcesChanged", params: { providers: { local: null } } })).toThrow()
    expect(() => parseNativeValue(nativeNotificationSchema, { method: "workerRoutingChanged", params: { revision: 1, localCardIds: [], offlineWorkers: [{ id: "offline", cardIds: [] }] } })).toThrow()
    expect(() => parseNativeValue(nativeNotificationSchema, { method: "unknown", params: {} })).toThrow()
  })

  it("rejects impossible progress while allowing version negotiation after parsing", () => {
    const frame = { type: "initializing", protocolVersion: PROTOCOL_VERSION + 1, daemonVersion: "1.0", pid: 1, logs: [], progress: { id: "index", label: "Index", stage: "build", completedSteps: 2, totalSteps: 1, startedAt: 1, elapsedMs: 0 } }
    expect(() => parseHostMessage(frame)).toThrow("completed steps")
    expect(parseHostMessage({ ...frame, progress: null })).toEqual({ ...frame, progress: null })
    expect(() => parseHostMessage({ type: "rpc" })).toThrow()
    expect(parseHostMessage({ ...frame, progress: null, futureCapability: true })).toEqual({ ...frame, progress: null, futureCapability: true })
  })
})
