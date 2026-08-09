import type {
  DaemonRouter,
  ExtensionConnectionCommandRequest,
  ExtensionConnectionCommandResult,
} from "@newsnext/extension-connection"
import type { PersistedDeviceState } from "../settings/persisted-settings"
import { createTRPCClient, createWSClient, wsLink } from "@trpc/client"
import { browser } from "#imports"
import { PERSISTED_DATA_SLICES } from "../settings/persisted-data"
import {
  normalizePersistedDeviceState,
  withSourceConnectionEnabled,
} from "../settings/persisted-settings"
import {
  compareSourceHistoryObservations,
  getSourceHistoryObservation,
  listSourceHistoryDatasets,
  listSourceHistoryObservations,
} from "../source/history/repository"
import { serializeSourceConnectionError } from "./source-connection-error"
import { listConnectedSources, runConnectedSource } from "./source-runner"

const DEFAULT_SOURCE_CONNECTION_WS_URL = "ws://127.0.0.1:43110"
const SOURCE_CONNECTION_RECONNECT_ALARM = "source-connection-websocket-reconnect"
const RECONNECT_ALARM_PERIOD_MINUTES = 0.5

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

type SourceConnectionClient = ReturnType<typeof createTRPCClient<DaemonRouter>>
type SourceConnectionWebSocketClient = ReturnType<typeof createWSClient>
type SourceConnectionSubscription = ReturnType<SourceConnectionClient["extension"]["commands"]["subscribe"]>

let client: SourceConnectionClient | undefined
let socketClient: SourceConnectionWebSocketClient | undefined
let subscription: SourceConnectionSubscription | undefined
let connectionState: SourceConnectionState = "disconnected"
let connectedAt: number | undefined
let enabled = false
const instanceId = crypto.randomUUID()

function getConnectionUrl(): string {
  return import.meta.env.WXT_SOURCE_CONNECTION_WS_URL || DEFAULT_SOURCE_CONNECTION_WS_URL
}

export function getSourceConnectionStatus(): SourceConnectionStatus {
  return {
    enabled,
    state: enabled ? connectionState : "disabled",
    url: getConnectionUrl(),
    connectedAt,
  }
}

async function executeRequest(request: ExtensionConnectionCommandRequest): Promise<unknown> {
  switch (request.type) {
    case "source.list":
      return (await listConnectedSources()).data
    case "source.run":
      return (await runConnectedSource(request)).data
    case "source-history.datasets":
      return await listSourceHistoryDatasets(request)
    case "source-history.observations":
      return await listSourceHistoryObservations(request)
    case "source-history.get":
      return await getSourceHistoryObservation(request)
    case "source-history.compare":
      return await compareSourceHistoryObservations(request)
  }
}

async function executeCommand(
  connection: SourceConnectionClient,
  request: ExtensionConnectionCommandRequest,
): Promise<void> {
  let result: ExtensionConnectionCommandResult
  try {
    result = {
      id: request.id,
      ok: true,
      data: await executeRequest(request),
    }
  } catch (error) {
    result = {
      id: request.id,
      ok: false,
      error: serializeSourceConnectionError(error),
    }
  }

  if (!enabled || client !== connection) {
    return
  }
  await connection.extension.complete.mutate(result)
}

function disconnect(): void {
  subscription?.unsubscribe()
  subscription = undefined
  socketClient?.close()
  socketClient = undefined
  client = undefined
  connectedAt = undefined
  connectionState = "disconnected"
}

function connect(): void {
  if (!enabled || socketClient) {
    return
  }

  connectionState = "connecting"
  const nextSocketClient = createWSClient({
    connectionParams: () => ({
      id: instanceId,
      browser: import.meta.env.BROWSER,
      extensionVersion: browser.runtime.getManifest().version,
    }),
    onClose: () => {
      if (socketClient === nextSocketClient) {
        connectedAt = undefined
        connectionState = "disconnected"
      }
    },
    onOpen: () => {
      if (!enabled || socketClient !== nextSocketClient) {
        nextSocketClient.close()
        return
      }
      connectedAt = Date.now()
      connectionState = "connected"
    },
    url: getConnectionUrl(),
  })
  const nextClient = createTRPCClient<DaemonRouter>({
    links: [wsLink({ client: nextSocketClient })],
  })
  socketClient = nextSocketClient
  client = nextClient
  subscription = nextClient.extension.commands.subscribe(undefined, {
    onData: request => void executeCommand(nextClient, request).catch((error) => {
      console.error("Failed to return source connection result", error)
    }),
    onError: error => console.error("Source connection subscription failed", error),
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

export async function registerSourceConnectionWebSocket(): Promise<void> {
  browser.alarms.onAlarm.addListener((alarm) => {
    if (
      enabled
      && alarm.name === SOURCE_CONNECTION_RECONNECT_ALARM
      && connectionState === "disconnected"
    ) {
      disconnect()
      connect()
    }
  })
  browser.storage.onChanged.addListener((changes, areaName) => {
    const change = changes[PERSISTED_DATA_SLICES.deviceState.key]
    if (areaName === "local" && change) {
      const state = normalizePersistedDeviceState(change.newValue)
      void applySourceConnectionEnabled(state.sourceConnectionEnabled)
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
