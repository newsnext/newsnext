import { describe, expect, it } from "vitest"
import {
  classifyNativeIntegrationFailure,
  getNativeIntegrationReconnectDelay,
  isVersionAtLeast,
} from "./connection"

describe("native integration connection", () => {
  it.each([
    ["Specified native messaging host not found.", "hostNotInstalled"],
    ["Access to the specified native messaging host is forbidden.", "hostNotInstalled"],
    ["No such native application app.newsnext.host", "hostNotInstalled"],
    ["Unsupported protocol version 16; expected 17", "protocolIncompatible"],
    ["The NewsNext Worker is already connected", "workerConflict"],
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
    ["1.0.0-beta.2", "1.0.0-beta.3", false],
    ["1.0.0-beta.3", "1.0.0-beta.3", true],
    ["1.0.0", "1.0.0-beta.3", true],
    ["1.1.0", "1.0.0", true],
    ["invalid", "1.0.0", false],
  ] as const)("compares daemon version %s against %s", (actual, minimum, expected) => {
    expect(isVersionAtLeast(actual, minimum)).toBe(expected)
  })

  it.each([
    ["HOST_MISSING", "hostNotInstalled"],
    ["PROTOCOL_INCOMPATIBLE", "protocolIncompatible"],
    ["WORKER_ALREADY_CONNECTED", "workerConflict"],
    ["DAEMON_OUTDATED", "daemonOutdated"],
    ["DAEMON_START_FAILED", "serviceNotRunning"],
  ] as const)("prefers structured error code %s", (code, expected) => {
    const message = "unclassified message"
    expect(classifyNativeIntegrationFailure(message, code)).toBe(expected)
  })
})
