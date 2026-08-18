import type {
  ExtensionConnectionCommandRequest,
  ExtensionConnectionFetchResponse,
  ExtensionToHost,
  HostToExtension,
  NativeCommandResult,
  NativeExtensionBoard,
} from "@newsnext/extension-connection"
import type { PersistedDeviceState } from "../settings/persisted-settings"
import {
  parseExtensionConnectionCommandRequest,
} from "@newsnext/extension-connection"
import { createSourceFetch } from "@newsnext/source/utils"
import { browser } from "#imports"
import { openAppTab } from "../app-tab"
import {
  listApplicationActions,
  listApplicationQueries,
  parseApplicationAction,
  parseApplicationQuery,
} from "../application"
import { ALL_BOARD_ID, ALL_BOARD_NAME } from "../board"
import { normalizeApplicationData, PERSISTED_DATA_SLICES } from "../settings/persisted-data"
import {
  normalizePersistedDeviceState,
  withSourceConnectionEnabled,
} from "../settings/persisted-settings"
import {
  executeBackgroundApplicationAction,
  executeBackgroundApplicationQuery,
} from "./application-service"
import { serializeSourceConnectionError } from "./source-connection-error"
import { runConnectedSource } from "./source-runner"

const NATIVE_HOST_NAME = import.meta.env.DEV
  ? "app.newsnext.host.dev"
  : "app.newsnext.host"
const PROTOCOL_VERSION = 5
const SOURCE_CONNECTION_INSTANCE_ID_KEY = "newsnext.sourceConnectionInstanceId"
const SOURCE_CONNECTION_RECONNECT_ALARM = "source-connection-native-reconnect"
const RECONNECT_ALARM_PERIOD_MINUTES = 0.5

export type SourceConnectionState
  = | "disabled"
    | "connected"
    | "connecting"
    | "disconnected"

export interface SourceConnectionStatus {
  cliVersion?: string
  state: SourceConnectionState
}

type NativePort = ReturnType<typeof browser.runtime.connectNative>
type ParsedHostMessage
  = | Extract<HostToExtension, { type: "ready" }>
    | Extract<HostToExtension, { type: "error" }>
    | {
      type: "execute"
      request: ExtensionConnectionCommandRequest
    }

let port: NativePort | undefined
let cliVersion: string | undefined
let connectionState: SourceConnectionState = "disconnected"
let enabled = false
let instanceId = ""
let boards: NativeExtensionBoard[] = []

function connectionBoards(value: unknown): NativeExtensionBoard[] {
  const application = normalizeApplicationData(value)
  return [
    { id: ALL_BOARD_ID, name: ALL_BOARD_NAME },
    ...application.collections.map(collection => ({
      id: collection.id,
      name: collection.name,
    })),
  ]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function parseHostMessage(value: unknown): ParsedHostMessage {
  if (!isRecord(value) || typeof value.type !== "string") {
    throw new Error("The native host returned an invalid message")
  }
  if (
    value.type === "ready"
    && typeof value.protocolVersion === "number"
    && typeof value.daemonVersion === "string"
  ) {
    return {
      type: "ready",
      protocolVersion: value.protocolVersion,
      daemonVersion: value.daemonVersion,
    }
  }
  if (value.type === "execute") {
    return {
      type: "execute",
      request: parseExtensionConnectionCommandRequest(value.request),
    }
  }
  if (
    value.type === "error"
    && (typeof value.requestId === "string" || value.requestId === null)
    && typeof value.message === "string"
  ) {
    return {
      type: "error",
      requestId: value.requestId,
      message: value.message,
    }
  }
  throw new Error("The native host returned an unsupported message")
}

async function executeFetchRequest(
  request: Extract<ExtensionConnectionCommandRequest, { type: "fetch" }>,
): Promise<ExtensionConnectionFetchResponse> {
  const url = new URL(request.url)
  const hasHostPermission = await browser.permissions.contains({
    origins: [`${url.protocol}//${url.hostname}/*`],
  })
  if (!hasHostPermission) {
    throw new Error(`Extension does not have host permission for ${url.origin}`)
  }
  const signal = AbortSignal.timeout(request.timeoutMs)
  const response = await createSourceFetch(signal)(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    retry: 0,
    throwHttpErrors: false,
    timeout: false,
  })
  return {
    status: response.status,
    statusText: response.statusText,
    headers: [...response.headers.entries()],
    body: await response.text(),
  }
}

export function getSourceConnectionStatus(): SourceConnectionStatus {
  return {
    cliVersion,
    state: enabled ? connectionState : "disabled",
  }
}

async function openBoard(boardId: string): Promise<void> {
  const appUrl = browser.runtime.getURL("/app.html")
  const boardUrl = `${appUrl}#/board/${encodeURIComponent(boardId)}`
  await openAppTab(boardUrl)
}

async function executeRequest(request: ExtensionConnectionCommandRequest): Promise<unknown> {
  switch (request.type) {
    case "app.open":
      await openBoard(request.boardId)
      return null
    case "application.action.list":
      return listApplicationActions()
    case "application.action.execute":
      return await executeBackgroundApplicationAction(parseApplicationAction({
        type: request.name,
        input: request.input,
      }))
    case "application.query.list":
      return listApplicationQueries()
    case "application.query.execute":
      return await executeBackgroundApplicationQuery(parseApplicationQuery({
        type: request.name,
        input: request.input,
      }))
    case "fetch":
      return await executeFetchRequest(request)
    case "source.run":
      return await runConnectedSource(request)
  }
}

async function executeCommand(
  connection: NativePort,
  request: ExtensionConnectionCommandRequest,
): Promise<void> {
  let result: NativeCommandResult
  try {
    result = {
      ok: true,
      data: await executeRequest(request),
    }
  } catch (error) {
    result = {
      ok: false,
      error: serializeSourceConnectionError(error),
    }
  }

  if (!enabled || port !== connection) {
    return
  }
  const message: ExtensionToHost = {
    type: "complete",
    requestId: request.id,
    result,
  }
  connection.postMessage(message)
}

function disconnect(): void {
  port?.disconnect()
  port = undefined
  cliVersion = undefined
  connectionState = "disconnected"
}

function connect(): void {
  if (!enabled || !instanceId || port) {
    return
  }

  connectionState = "connecting"
  cliVersion = undefined
  const nextPort = browser.runtime.connectNative(NATIVE_HOST_NAME)
  port = nextPort
  nextPort.onDisconnect.addListener(() => {
    if (port === nextPort) {
      port = undefined
      cliVersion = undefined
      connectionState = "disconnected"
    }
  })
  nextPort.onMessage.addListener((value: unknown) => {
    if (!enabled || port !== nextPort) {
      return
    }
    try {
      const message = parseHostMessage(value)
      if (message.type === "ready") {
        if (message.protocolVersion !== PROTOCOL_VERSION) {
          throw new Error(`Unsupported native protocol version ${message.protocolVersion}`)
        }
        cliVersion = message.daemonVersion
        connectionState = "connected"
      } else if (message.type === "execute") {
        void executeCommand(nextPort, message.request).catch((error) => {
          console.error("Failed to return native source connection result", error)
        })
      } else {
        console.error("NewsNext native host error", message.message)
      }
    } catch (error) {
      console.error("Failed to process NewsNext native host message", error)
      disconnect()
    }
  })

  const hello: ExtensionToHost = {
    type: "hello",
    protocolVersion: PROTOCOL_VERSION,
    instance: {
      id: instanceId,
      browser: import.meta.env.BROWSER,
      extensionVersion: browser.runtime.getManifest().version,
      boards,
    },
  }
  nextPort.postMessage(hello)
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

  disconnect()
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

export async function registerSourceConnectionNative(): Promise<void> {
  browser.alarms.onAlarm.addListener((alarm) => {
    if (
      enabled
      && alarm.name === SOURCE_CONNECTION_RECONNECT_ALARM
      && connectionState === "disconnected"
    ) {
      connect()
    }
  })
  browser.storage.onChanged.addListener((changes, areaName) => {
    const applicationChange = changes[PERSISTED_DATA_SLICES.application.key]
    if (areaName === "local" && applicationChange) {
      boards = connectionBoards(applicationChange.newValue)
      if (port) {
        const message: ExtensionToHost = { type: "boardsChanged", boards }
        port.postMessage(message)
      }
    }
    const change = changes[PERSISTED_DATA_SLICES.deviceState.key]
    if (areaName === "local" && change) {
      const state = normalizePersistedDeviceState(change.newValue)
      void applySourceConnectionEnabled(state.sourceConnectionEnabled)
    }
  })

  const stored = await browser.storage.local.get([
    PERSISTED_DATA_SLICES.deviceState.key,
    PERSISTED_DATA_SLICES.application.key,
    SOURCE_CONNECTION_INSTANCE_ID_KEY,
  ])
  const storedInstanceId = stored[SOURCE_CONNECTION_INSTANCE_ID_KEY]
  instanceId = typeof storedInstanceId === "string" && storedInstanceId
    ? storedInstanceId
    : crypto.randomUUID()
  if (instanceId !== storedInstanceId) {
    await browser.storage.local.set({ [SOURCE_CONNECTION_INSTANCE_ID_KEY]: instanceId })
  }
  const persisted = stored[PERSISTED_DATA_SLICES.deviceState.key]
  boards = connectionBoards(stored[PERSISTED_DATA_SLICES.application.key])
  const state = normalizePersistedDeviceState(persisted)
  enabled = state.sourceConnectionEnabled
  if (enabled) {
    browser.alarms.create(SOURCE_CONNECTION_RECONNECT_ALARM, {
      periodInMinutes: RECONNECT_ALARM_PERIOD_MINUTES,
    })
    connect()
  } else {
    await browser.alarms.clear(SOURCE_CONNECTION_RECONNECT_ALARM)
  }
}
