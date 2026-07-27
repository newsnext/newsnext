import process from "node:process"
import { CliError } from "./errors"

export const DEFAULT_SOURCE_CONNECTION_WS_URL = "ws://127.0.0.1:43110"
export const DEFAULT_SOURCE_CONNECTION_TIMEOUT_MS = 60_000

export interface SourceConnectionValues {
  "browser"?: string
  "timeout"?: string
  "ws-url"?: string
}

export interface SourceConnectionOptions {
  browser?: string
  timeoutMs: number
  wsUrl: URL
}

export const SOURCE_CONNECTION_ARGS = {
  "browser": {
    type: "string",
    description: "Select a connected browser",
    valueHint: "BROWSER",
  },
  "timeout": {
    type: "string",
    description: "Connection and execution timeout in seconds",
    default: "60",
    valueHint: "SECONDS",
  },
  "ws-url": {
    type: "string",
    description: "Loopback WebSocket URL used by the extension",
    valueHint: "URL",
  },
} as const

export function normalizeSourceConnectionUrl(value: string): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new CliError(`Invalid source connection WebSocket URL: ${value}`, 2)
  }

  if (url.protocol !== "ws:" || !["127.0.0.1", "localhost"].includes(url.hostname)) {
    throw new CliError("The source connection WebSocket URL must be a loopback ws:// URL", 2)
  }
  if (!url.port) {
    url.port = "43110"
  }
  return url
}

export function resolveSourceConnectionUrl(value?: string): URL {
  return normalizeSourceConnectionUrl(
    value
    ?? process.env.WXT_SOURCE_CONNECTION_WS_URL
    ?? DEFAULT_SOURCE_CONNECTION_WS_URL,
  )
}

export function normalizeSourceConnectionOptions(
  values: SourceConnectionValues,
): SourceConnectionOptions {
  const timeoutSeconds = values.timeout === undefined
    ? DEFAULT_SOURCE_CONNECTION_TIMEOUT_MS / 1_000
    : Number(values.timeout)
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0 || timeoutSeconds > 600) {
    throw new CliError("--timeout must be a number between 0 and 600 seconds", 2)
  }

  return {
    browser: values.browser,
    timeoutMs: Math.round(timeoutSeconds * 1_000),
    wsUrl: resolveSourceConnectionUrl(values["ws-url"]),
  }
}
