import { describe, expect, it } from "vitest"
import {
  classifyAppIntegrationFailure,
  getAppIntegrationReconnectDelay,
} from "./app-integration-connection"

describe("app integration connection", () => {
  it.each([
    ["Specified native messaging host not found.", "hostNotInstalled"],
    ["Access to the specified native messaging host is forbidden.", "hostNotInstalled"],
    ["No such native application app.newsnext.host", "hostNotInstalled"],
    ["Unsupported protocol version 16; expected 17", "protocolIncompatible"],
    ["The NewsNext Worker is already connected", "workerConflict"],
    ["Native host has exited.", "serviceNotRunning"],
    [undefined, "serviceNotRunning"],
  ] as const)("classifies %s", (message, expected) => {
    expect(classifyAppIntegrationFailure(message)).toBe(expected)
  })

  it("caps reconnect delays at the final backoff", () => {
    expect([-1, 0, 1, 2, 3, 4, 5, 20].map(getAppIntegrationReconnectDelay)).toEqual([
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
})
