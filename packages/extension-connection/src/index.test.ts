import { describe, expect, it } from "vitest"
import {
  DAEMON_TRPC_PATH,
  getDaemonEndpoint,
  parseDaemonExecuteInput,
  parseExtensionConnectionCommandRequest,
  parseExtensionConnectionCommandResult,
  parseExtensionConnectionInstance,
} from "."

describe("extension connection protocol", () => {
  it("maps WebSocket URLs to the daemon tRPC endpoint", () => {
    expect(getDaemonEndpoint(new URL("ws://127.0.0.1:43110")).href)
      .toBe(`http://127.0.0.1:43110${DAEMON_TRPC_PATH}`)
  })

  it("validates daemon execution input", () => {
    const input = {
      request: { id: "request-id", type: "source.list" },
      browser: "chrome",
      timeoutMs: 1_000,
    }
    expect(parseDaemonExecuteInput(input)).toEqual(input)
    expect(() => parseDaemonExecuteInput({
      request: { id: "request-id", type: "unknown" },
      timeoutMs: 1_000,
    })).toThrow("Invalid extension command")
  })

  it("validates command-specific fields", () => {
    expect(parseExtensionConnectionCommandRequest({
      id: "request-id",
      type: "source.run",
      sourceId: "github:trending",
      params: { language: "typescript" },
    })).toMatchObject({
      id: "request-id",
      type: "source.run",
      sourceId: "github:trending",
    })
    expect(() => parseExtensionConnectionCommandRequest({
      id: "request-id",
      type: "source.run",
      providerId: "github",
      sourceId: "github:trending",
    })).toThrow("Invalid extension command")
    expect(() => parseExtensionConnectionCommandRequest({
      id: "request-id",
      type: "source-history.get",
      sourceId: "github:trending",
      observedAt: "yesterday",
    })).toThrow("Invalid extension command")
  })

  it("validates extension metadata and results", () => {
    expect(parseExtensionConnectionInstance({
      id: "instance-id",
      browser: "chrome",
      extensionVersion: "1.0.0",
    })).toEqual({
      id: "instance-id",
      browser: "chrome",
      extensionVersion: "1.0.0",
    })
    expect(parseExtensionConnectionCommandResult({
      id: "request-id",
      ok: false,
      error: {
        name: "SourceLoginRequiredError",
        message: "Login required",
        code: "SOURCE_LOGIN_REQUIRED",
      },
    })).toMatchObject({
      id: "request-id",
      ok: false,
      error: { code: "SOURCE_LOGIN_REQUIRED" },
    })
  })
})
