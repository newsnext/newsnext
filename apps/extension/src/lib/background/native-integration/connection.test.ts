import { describe, expect, it } from "vitest"
import {
  classifyNativeIntegrationFailure,
  getNativeIntegrationReconnectDelay,
} from "./connection"

describe("native integration connection", () => {
  it.each([
    ["Specified native messaging host not found.", "hostNotInstalled"],
    ["Access to the specified native messaging host is forbidden.", "hostNotInstalled"],
    ["No such native application app.newsnext.host", "hostNotInstalled"],
    ["Native host has exited.", "serviceNotRunning"],
    [undefined, "serviceNotRunning"],
  ] as const)("classifies %s", (message, expected) => {
    expect(classifyNativeIntegrationFailure(message)).toBe(expected)
  })

  it("caps reconnect delays at the final backoff", () => {
    expect([-1, 0, 1, 2, 3, 4, 5, 20].map(getNativeIntegrationReconnectDelay)).toEqual([
      1_000,
      1_000,
      2_000,
      5_000,
      15_000,
      30_000,
      30_000,
      30_000,
    ])
  })

  it.each([
    ["HOST_MISSING", "hostNotInstalled"],
    ["PROTOCOL_INCOMPATIBLE", "protocolIncompatible"],
    ["WORKER_ALREADY_CONNECTED", "workerConflict"],
    ["DAEMON_START_FAILED", "daemonStartFailed"],
  ] as const)("prefers structured error code %s", (code, expected) => {
    const message = "unclassified message"
    expect(classifyNativeIntegrationFailure(message, code)).toBe(expected)
  })
})
