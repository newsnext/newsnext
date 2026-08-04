import type {
  SourceConnectionRequest,
  SourceConnectionResponse,
  SourceConnectionRunRequest,
  SourceConnectionSerializedError,
} from "@newsnext/shared/types"
import type { PersistedDeviceState } from "../persisted-settings"
import { browser } from "#imports"
import { PERSISTED_DATA_SLICES } from "../persisted-data"
import {
  normalizePersistedDeviceState,
  withSourceConnectionEnabled,
} from "../persisted-settings"
import { listConnectedSources, runConnectedSource } from "./source-runner"

const DEFAULT_SOURCE_CONNECTION_WS_URL = "ws://127.0.0.1:43110"
const SOURCE_CONNECTION_RECONNECT_ALARM = "source-connection-websocket-reconnect"
const HEARTBEAT_INTERVAL_MS = 20_000
const RECONNECT_DELAY_MS = 1_000
const RECONNECT_ALARM_PERIOD_MINUTES = 0.5
const WEBSOCKET_CONNECTING_STATE = 0
const WEBSOCKET_OPEN_STATE = 1

export type SourceConnectionState
  = | "disabled"
    | "connected"
    | "connecting"
    | "disconnected"

export interface SourceConnectionStatus {
  enabled: boolean
  state: SourceConnectionState
  url: string
  connectedAt?: number
}

let socket: WebSocket | undefined
let heartbeatTimer: ReturnType<typeof setInterval> | undefined
let reconnectTimer: ReturnType<typeof setTimeout> | undefined
let connectedAt: number | undefined
let enabled = false
const instanceId = crypto.randomUUID()

export function resolveSourceConnectionState(
  readyState?: number,
): SourceConnectionState {
  if (readyState === WEBSOCKET_OPEN_STATE) {
    return "connected"
  }
  if (readyState === WEBSOCKET_CONNECTING_STATE) {
    return "connecting"
  }
  return "disconnected"
}

export function getSourceConnectionStatus(): SourceConnectionStatus {
  return {
    enabled,
    state: enabled ? resolveSourceConnectionState(socket?.readyState) : "disabled",
    url: import.meta.env.WXT_SOURCE_CONNECTION_WS_URL || DEFAULT_SOURCE_CONNECTION_WS_URL,
    connectedAt,
  }
}

function getStringProperty(value: object, key: string): string | undefined {
  const property = (value as Record<string, unknown>)[key]
  return typeof property === "string" ? property : undefined
}

export function serializeSourceConnectionError(error: unknown): SourceConnectionSerializedError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: getStringProperty(error, "code"),
      loginUrl: getStringProperty(error, "loginUrl"),
    }
  }

  return {
    name: "Error",
    message: String(error),
  }
}

function send(response: SourceConnectionResponse): void {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(response))
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function parseSourceConnectionRequest(value: unknown): SourceConnectionRequest {
  if (typeof value !== "string") {
    throw new TypeError("Source connection messages must be JSON strings")
  }

  const request = JSON.parse(value) as unknown
  if (!isRecord(request)) {
    throw new Error("Invalid source run message")
  }

  if (request.type === "ping") {
    return {
      id: typeof request.id === "string" ? request.id : undefined,
      type: "ping",
    }
  }
  if (
    request.type === "source.list"
    && typeof request.id === "string"
  ) {
    return {
      id: request.id,
      type: "source.list",
    }
  }
  if (
    request.type === "source.run"
    && typeof request.id === "string"
    && typeof request.sourceId === "string"
    && (request.params === undefined || isRecord(request.params))
  ) {
    if (request.providerId === undefined && request.provider === undefined) {
      return {
        id: request.id,
        type: "source.run",
        sourceId: request.sourceId,
        params: request.params,
      } satisfies SourceConnectionRunRequest
    }
    if (typeof request.providerId !== "string" || !isRecord(request.provider)) {
      throw new Error("Unsupported source run message")
    }
    return {
      id: request.id,
      type: "source.run",
      providerId: request.providerId,
      sourceId: request.sourceId,
      provider: request.provider,
      params: request.params,
      useProviderSecrets: request.useProviderSecrets === true,
    } satisfies SourceConnectionRunRequest
  }

  throw new Error("Unsupported source run message")
}

async function handleMessage(event: MessageEvent): Promise<void> {
  let request: SourceConnectionRequest
  try {
    request = parseSourceConnectionRequest(event.data)
  } catch (error) {
    console.error("Failed to parse source run message", error)
    return
  }

  if (request.type === "ping") {
    send({ id: request.id, type: "pong" })
    return
  }

  try {
    const result = request.type === "source.list"
      ? await listConnectedSources()
      : await runConnectedSource(request)
    send({
      id: request.id,
      type: "source.result",
      ok: true,
      data: result.data,
    })
  } catch (error) {
    send({
      id: request.id,
      type: "source.result",
      ok: false,
      error: serializeSourceConnectionError(error),
    })
  }
}

function clearConnectionTimers(): void {
  if (heartbeatTimer !== undefined) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = undefined
  }
  if (reconnectTimer !== undefined) {
    clearTimeout(reconnectTimer)
    reconnectTimer = undefined
  }
}

function scheduleReconnect(): void {
  if (!enabled || reconnectTimer !== undefined) {
    return
  }
  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined
    connect()
  }, RECONNECT_DELAY_MS)
}

function connect(): void {
  if (
    !enabled
    || socket?.readyState === WebSocket.CONNECTING
    || socket?.readyState === WebSocket.OPEN
  ) {
    return
  }

  clearConnectionTimers()
  const nextSocket = new WebSocket(
    import.meta.env.WXT_SOURCE_CONNECTION_WS_URL || DEFAULT_SOURCE_CONNECTION_WS_URL,
  )
  socket = nextSocket
  nextSocket.addEventListener("open", () => {
    if (!enabled || socket !== nextSocket) {
      nextSocket.close()
      return
    }
    connectedAt = Date.now()
    send({
      type: "ready",
      instance: {
        id: instanceId,
        browser: import.meta.env.BROWSER,
        extensionVersion: browser.runtime.getManifest().version,
      },
    })
    heartbeatTimer = setInterval(() => {
      send({ type: "ping" })
    }, HEARTBEAT_INTERVAL_MS)
  })
  nextSocket.addEventListener("message", (event) => {
    if (enabled && socket === nextSocket) {
      void handleMessage(event)
    }
  })
  nextSocket.addEventListener("close", () => {
    if (socket !== nextSocket) {
      return
    }
    socket = undefined
    connectedAt = undefined
    clearConnectionTimers()
    scheduleReconnect()
  })
  nextSocket.addEventListener("error", () => {
    nextSocket.close()
  })
}

async function applySourceConnectionEnabled(nextEnabled: boolean): Promise<void> {
  if (enabled === nextEnabled) {
    return
  }

  enabled = nextEnabled
  if (enabled) {
    browser.alarms.create(SOURCE_CONNECTION_RECONNECT_ALARM, {
      periodInMinutes: RECONNECT_ALARM_PERIOD_MINUTES,
    })
    connect()
    return
  }

  clearConnectionTimers()
  connectedAt = undefined
  const currentSocket = socket
  socket = undefined
  currentSocket?.close()
  await browser.alarms.clear(SOURCE_CONNECTION_RECONNECT_ALARM)
}

export async function setSourceConnectionEnabled(
  nextEnabled: boolean,
  frontendState?: PersistedDeviceState,
): Promise<SourceConnectionStatus> {
  const stored = await browser.storage.local.get(PERSISTED_DATA_SLICES.deviceState.key)
  const state = normalizePersistedDeviceState(
    stored[PERSISTED_DATA_SLICES.deviceState.key] ?? frontendState,
  )
  await browser.storage.local.set({
    [PERSISTED_DATA_SLICES.deviceState.key]: withSourceConnectionEnabled(
      state,
      nextEnabled,
    ),
  })
  await applySourceConnectionEnabled(nextEnabled)
  return getSourceConnectionStatus()
}

export async function registerSourceConnectionWebSocket(): Promise<void> {
  browser.alarms.onAlarm.addListener((alarm) => {
    if (enabled && alarm.name === SOURCE_CONNECTION_RECONNECT_ALARM) {
      connect()
    }
  })
  browser.storage.onChanged.addListener((changes, areaName) => {
    const change = changes[PERSISTED_DATA_SLICES.deviceState.key]
    if (areaName === "local" && change) {
      const state = normalizePersistedDeviceState(change.newValue)
      void applySourceConnectionEnabled(
        state.sourceConnectionEnabled,
      )
    }
  })

  const stored = await browser.storage.local.get(PERSISTED_DATA_SLICES.deviceState.key)
  const persisted = stored[PERSISTED_DATA_SLICES.deviceState.key]
  enabled = normalizePersistedDeviceState(persisted).sourceConnectionEnabled
  if (enabled) {
    browser.alarms.create(SOURCE_CONNECTION_RECONNECT_ALARM, {
      periodInMinutes: RECONNECT_ALARM_PERIOD_MINUTES,
    })
    connect()
  } else {
    await browser.alarms.clear(SOURCE_CONNECTION_RECONNECT_ALARM)
  }
}
