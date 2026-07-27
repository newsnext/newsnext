import type {
  DaemonExecuteInput,
  DaemonExecuteResponse,
  DaemonStatus,
} from "./daemon-protocol"
import type { CliIO } from "./io"
import type { SourceConnectionOptions } from "./source-connection-options"
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import process from "node:process"
import { parseArgs } from "citty"
import {
  DAEMON_EXECUTE_PATH,
  DAEMON_STATUS_PATH,
  DAEMON_STOP_PATH,
  getDaemonEndpoint,
} from "./daemon-protocol"
import { CliError } from "./errors"
import { writeLine } from "./io"
import {
  resolveSourceConnectionUrl,
} from "./source-connection-options"
import { SourceConnectionRemoteError, SourceConnectionSession } from "./source-run/session"

const DAEMON_START_TIMEOUT_MS = 5_000
const DAEMON_REQUEST_TIMEOUT_MS = 1_000
const DAEMON_POLL_INTERVAL_MS = 50

interface DaemonCommandOptions {
  wsUrl: URL
}

interface DaemonCommandValues {
  "ws-url"?: string
}

export const DAEMON_COMMAND_ARGS = {
  "ws-url": {
    type: "string",
    description: "Loopback WebSocket URL used by the server and extension",
    valueHint: "URL",
  },
} as const

function delay(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function parseDaemonCommandOptions(args: string[]): DaemonCommandOptions {
  let values: DaemonCommandValues
  try {
    values = parseArgs(args, DAEMON_COMMAND_ARGS) as DaemonCommandValues
  } catch (error) {
    throw new CliError(error instanceof Error ? error.message : String(error), 2)
  }

  return {
    wsUrl: resolveSourceConnectionUrl(values["ws-url"]),
  }
}

async function fetchDaemon(
  wsUrl: URL,
  pathname: string,
  init?: RequestInit,
  timeoutMs = DAEMON_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  return await fetch(getDaemonEndpoint(wsUrl, pathname), {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  })
}

export async function getDaemonStatus(wsUrl: URL): Promise<DaemonStatus | undefined> {
  try {
    const response = await fetchDaemon(wsUrl, DAEMON_STATUS_PATH)
    if (!response.ok) {
      return
    }
    return await response.json() as DaemonStatus
  } catch {
  }
}

function getDaemonSpawnInvocation(args: string[]): { command: string, args: string[] } {
  const entrypoint = process.argv[1]
  const isSourceEntrypoint = Boolean(
    entrypoint
    && /\.[cm]?[jt]sx?$/.test(entrypoint)
    && existsSync(entrypoint),
  )
  return {
    command: process.execPath,
    args: isSourceEntrypoint ? [entrypoint, ...args] : args,
  }
}

async function waitForDaemon(
  wsUrl: URL,
  predicate: (status: DaemonStatus | undefined) => boolean,
): Promise<DaemonStatus | undefined> {
  const deadline = Date.now() + DAEMON_START_TIMEOUT_MS
  while (Date.now() < deadline) {
    const status = await getDaemonStatus(wsUrl)
    if (predicate(status)) {
      return status
    }
    await delay(DAEMON_POLL_INTERVAL_MS)
  }
  return await getDaemonStatus(wsUrl)
}

async function startDaemon(options: DaemonCommandOptions, io: CliIO): Promise<number> {
  const existing = await getDaemonStatus(options.wsUrl)
  if (existing) {
    writeLine(io.stdout, `NewsNext server is already running (PID ${existing.pid}).`)
    return 0
  }

  const invocation = getDaemonSpawnInvocation([
    "__daemon",
    "--ws-url",
    options.wsUrl.href,
  ])
  const child = spawn(invocation.command, invocation.args, {
    detached: true,
    stdio: "ignore",
  })
  child.unref()

  const status = await waitForDaemon(options.wsUrl, value => value !== undefined)
  if (!status) {
    throw new CliError(`NewsNext server did not start at ${options.wsUrl.href}`)
  }
  writeLine(io.stdout, `NewsNext server started (PID ${status.pid}) at ${status.url}.`)
  return 0
}

export async function runStartCommand(args: string[], io: CliIO): Promise<number> {
  return startDaemon(parseDaemonCommandOptions(args), io)
}

export async function runStatusCommand(args: string[], io: CliIO): Promise<number> {
  const options = parseDaemonCommandOptions(args)

  const status = await getDaemonStatus(options.wsUrl)
  if (!status) {
    writeLine(io.stdout, `NewsNext server is stopped (${options.wsUrl.href}).`)
    return 1
  }

  writeLine(io.stdout, `NewsNext server is running (PID ${status.pid}).`)
  writeLine(io.stdout, `Connection: ${status.url}`)
  writeLine(io.stdout, `Extensions: ${status.instances.length}`)
  for (const instance of status.instances) {
    writeLine(
      io.stdout,
      `  ${instance.browser} ${instance.extensionVersion} (${instance.id.slice(0, 8)})`,
    )
  }
  return 0
}

async function stopDaemon(options: DaemonCommandOptions, io: CliIO): Promise<number> {
  const status = await getDaemonStatus(options.wsUrl)
  if (!status) {
    writeLine(io.stdout, "NewsNext server is already stopped.")
    return 0
  }

  await fetchDaemon(options.wsUrl, DAEMON_STOP_PATH, { method: "POST" })
  const remaining = await waitForDaemon(options.wsUrl, value => value === undefined)
  if (remaining) {
    throw new CliError(`Could not stop NewsNext server (PID ${remaining.pid})`)
  }
  writeLine(io.stdout, `NewsNext server stopped (PID ${status.pid}).`)
  return 0
}

export async function runStopCommand(args: string[], io: CliIO): Promise<number> {
  return stopDaemon(parseDaemonCommandOptions(args), io)
}

export async function runRestartCommand(args: string[], io: CliIO): Promise<number> {
  const options = parseDaemonCommandOptions(args)
  await stopDaemon(options, io)
  return startDaemon(options, io)
}

export async function executeThroughDaemon(
  input: DaemonExecuteInput,
  options: Pick<SourceConnectionOptions, "wsUrl" | "timeoutMs">,
): Promise<Extract<DaemonExecuteResponse, { ok: true }>> {
  let response: Response
  try {
    response = await fetchDaemon(
      options.wsUrl,
      DAEMON_EXECUTE_PATH,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
      options.timeoutMs + DAEMON_REQUEST_TIMEOUT_MS,
    )
  } catch {
    throw new CliError("NewsNext server is not running. Start it with: newsnext start")
  }

  if (!response.ok) {
    throw new CliError(`NewsNext server returned HTTP ${response.status}`)
  }
  const result = await response.json() as DaemonExecuteResponse
  if (result.ok) {
    return result
  }
  if (result.kind === "source") {
    throw new SourceConnectionRemoteError(result.error)
  }
  throw new CliError(result.error.message)
}

export async function runDaemon(args: string[]): Promise<number> {
  const options = parseDaemonCommandOptions(args)

  let stop: (() => void) | undefined
  const stopped = new Promise<void>((resolve) => {
    stop = resolve
  })
  const session = new SourceConnectionSession(options.wsUrl, {
    onStop: () => stop?.(),
  })
  const handleSignal = (): void => stop?.()
  process.once("SIGINT", handleSignal)
  process.once("SIGTERM", handleSignal)
  await stopped
  process.off("SIGINT", handleSignal)
  process.off("SIGTERM", handleSignal)
  await session.close()
  return 0
}
