import type { Client } from "@orpc/client"
import type { BackgroundRouter } from "./background-orpc"
import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/message-port"
import { BACKGROUND_ORPC_PORT_NAME } from "./background-rpc-shared"

interface RuntimeConnector {
  runtime?: {
    connect?: (connectInfo?: { name?: string }) => unknown
  }
}

function getRuntimeConnector(): RuntimeConnector | undefined {
  const globalValue = globalThis as typeof globalThis & {
    browser?: RuntimeConnector
    chrome?: RuntimeConnector
  }

  return globalValue.browser?.runtime?.connect
    ? globalValue.browser
    : globalValue.chrome?.runtime?.connect
      ? globalValue.chrome
      : undefined
}

export function createBackgroundClient(): Client<BackgroundRouter> | undefined {
  const runtimeConnector = getRuntimeConnector()
  const port = runtimeConnector?.runtime?.connect?.({ name: BACKGROUND_ORPC_PORT_NAME })

  if (!port) {
    return undefined
  }

  const link = new RPCLink({ port })
  return createORPCClient<Client<BackgroundRouter>>(link)
}
