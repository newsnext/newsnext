import type { BackgroundService } from "./background/service"
import { createProxyService } from "@webext-core/proxy-service"
import { BACKGROUND_SERVICE_KEY } from "./background/service"

interface RuntimeConnector {
  runtime?: {
    sendMessage?: (...args: unknown[]) => unknown
  }
}

function getRuntimeConnector(): RuntimeConnector | undefined {
  const globalValue = globalThis as typeof globalThis & {
    browser?: RuntimeConnector
    chrome?: RuntimeConnector
  }

  return globalValue.browser?.runtime?.sendMessage
    ? globalValue.browser
    : globalValue.chrome?.runtime?.sendMessage
      ? globalValue.chrome
      : undefined
}

export function createBackgroundClient(): BackgroundService | undefined {
  const runtimeConnector = getRuntimeConnector()

  if (!runtimeConnector) {
    return undefined
  }

  return createProxyService(BACKGROUND_SERVICE_KEY)
}
