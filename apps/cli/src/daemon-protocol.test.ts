import { describe, expect, it } from "vitest"
import {
  DAEMON_EXECUTE_PATH,
  DAEMON_STATUS_PATH,
  getDaemonEndpoint,
} from "./daemon-protocol"

describe("getDaemonEndpoint", () => {
  it.each([
    ["ws://127.0.0.1:43110", DAEMON_STATUS_PATH, "http://127.0.0.1:43110/__newsnext/status"],
    ["wss://localhost:43110", DAEMON_EXECUTE_PATH, "http://localhost:43110/__newsnext/execute"],
  ])("maps %s to its loopback control endpoint", (wsUrl, path, expected) => {
    expect(getDaemonEndpoint(new URL(wsUrl), path).href).toBe(expected)
  })
})
